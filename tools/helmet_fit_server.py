"""Local visual helmet fitter. Run from anywhere; opens a browser and saves only placements.json."""
import argparse
import json
import math
from pathlib import Path
import shutil
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'assets/sprites/gear/common_helmets/placements.json'
INDEX = json.loads((TARGET.parent / 'index.json').read_text(encoding='utf-8'))


def validate(data):
    if not isinstance(data, dict) or data.get('version') != 1 or not isinstance(data.get('classes'), dict):
        raise ValueError('Expected version 1 and a classes object.')
    clean = {'version': 1, 'classes': {}}
    for cls, designs in data['classes'].items():
        if cls not in INDEX['classes'] or not isinstance(designs, dict):
            raise ValueError('Unknown class or invalid designs.')
        clean['classes'][cls] = {}
        for design, fit in designs.items():
            if design not in {str(d['id']) for d in INDEX['designs']} or not isinstance(fit, dict):
                raise ValueError('Unknown helmet design.')
            if set(fit) != {'x', 'y', 'scaleX', 'scaleY'}:
                raise ValueError('Each fit needs x, y, scaleX and scaleY.')
            for key, value in fit.items():
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                    raise ValueError('Fit values must be finite numbers.')
                lo, hi = (0.01, 4) if key.startswith('scale') else (-512, 512)
                if not lo <= value <= hi:
                    raise ValueError(f'{key} must be between {lo} and {hi}.')
            clean['classes'][cls][design] = fit
    return clean


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/api/helmet-placements':
            self.send_error(404)
            return
        origin = self.headers.get('Origin')
        expected = f'http://127.0.0.1:{self.server.server_port}'
        if self.headers.get('Host') != expected.removeprefix('http://') or origin not in (None, expected):
            self.send_error(403, 'Use the local fitter window.')
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 128_000:
                raise ValueError('Invalid data size.')
            data = validate(json.loads(self.rfile.read(length)))
            if TARGET.exists():
                shutil.copyfile(TARGET, TARGET.with_suffix('.json.bak'))
            temporary = TARGET.with_suffix('.json.tmp')
            temporary.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
            temporary.replace(TARGET)
            body = json.dumps({'saved': True, 'path': str(TARGET)}).encode()
            self.send_response(200)
        except (ValueError, OSError) as exc:
            body = json.dumps({'error': str(exc)}).encode()
            self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--port', type=int, default=0)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{server.server_port}/tools/helmet-fitter/'
    print(f'Helmet fitter: {url}', flush=True)
    print('Keep this window open while fitting. Ctrl+C stops the server.', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
