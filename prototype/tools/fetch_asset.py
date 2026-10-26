"""Fetch an image/video URL with up to 3 real attempts (variants: as given, other user agent, toggled
'/.renditions/' path or alternate URLs), logging every attempt to images/fetch-log.tsv.

    python3 tools/fetch_asset.py <key> <url> [alt_url ...]
Prints the URL that worked (or FAIL). Uses curl (system Python lacks CA certs here)."""
import datetime
import subprocess
import sys
from pathlib import Path

LOG = Path(__file__).resolve().parent.parent / "images" / "fetch-log.tsv"
UAS = ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
       "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
       "curl/8.4"]


def variants(url, alts):
    out = [url] + list(alts)
    if "/.renditions/" in url:
        out.append(url.replace("/.renditions/", "/"))
    elif "/media/wysiwyg/" in url:
        out.append(url.replace("/media/wysiwyg/", "/media/.renditions/wysiwyg/"))
    seen, uniq = set(), []
    for u in out:
        if u not in seen:
            seen.add(u); uniq.append(u)
    return uniq


def attempt(url, ua):
    r = subprocess.run(["curl", "-s", "-L", "-m", "40", "-A", ua, "-o", "/dev/null", "-w", "%{http_code} %{content_type} %{size_download}", url],
                       capture_output=True, text=True)
    code, ctype, size = (r.stdout.split(" ") + ["", "", ""])[:3]
    return code, ctype, size


def main():
    key, url, *alts = sys.argv[1:]
    LOG.parent.mkdir(exist_ok=True)
    new = not LOG.exists()
    with LOG.open("a") as log:
        if new:
            log.write("time\tkey\tattempt\turl\tuser_agent\tresult\n")
        tries = 0
        for u in variants(url, alts):
            for ua in UAS:
                tries += 1
                code, ctype, size = attempt(u, ua)
                good = code == "200" and (ctype.startswith("image") or ctype.startswith("video")) and int(size or 0) > 1000
                log.write(f"{datetime.datetime.now().isoformat(timespec='seconds')}\t{key}\t{tries}\t{u}\t{ua.split(' ')[0][:24]}\t{code} {ctype} {size}B {'OK' if good else 'FAIL'}\n")
                if good:
                    print(u)
                    return
                if tries >= 3 and u == variants(url, alts)[-1]:
                    break
            if tries >= 9:
                break
    print("FAIL")


if __name__ == "__main__":
    main()
