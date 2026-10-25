#!/usr/bin/env python3
"""English sentences with openly licensed audio from Tatoeba.

    scripts/tatoeba.py pool [--min 6 --max 20]   build scripts/pool.tsv from the Tatoeba exports
    scripts/tatoeba.py fetch <sentence_id> ...    download the audio into content/audio/tatoeba/
                                                  and print a dictation item for exercise.yaml

Only audio under CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 gets into the pool: most
Tatoeba recordings are CC BY-NC-ND or have no license, and those may not be
stored in the course. Each sentence comes with its Russian translations, if any.
Exports are cached in scripts/.cache (see https://tatoeba.org/en/downloads).
"""
import bz2
import csv
import io
import json
import pathlib
import sys
import tarfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
POOL = ROOT / "scripts" / "pool.tsv"
AUDIO = ROOT / "content" / "audio" / "tatoeba"
EXPORTS = "https://downloads.tatoeba.org/exports/"
FILES = [
    "per_language/eng/eng_sentences.tsv.bz2",
    "per_language/rus/rus_sentences.tsv.bz2",
    "per_language/eng/eng-rus_links.tsv.bz2",
    "sentences_with_audio.tar.bz2",
]
OPEN = {"CC BY 4.0": "CC BY 4.0", "CC BY-SA 4.0": "CC BY-SA 4.0", "CC0 1.0": "CC0 1.0"}

csv.field_size_limit(sys.maxsize)


def download():
    CACHE.mkdir(parents=True, exist_ok=True)
    for f in FILES:
        dst = CACHE / pathlib.Path(f).name
        if not dst.exists():
            print("download", f, file=sys.stderr)
            urllib.request.urlretrieve(EXPORTS + f, dst)


def tsv_bz2(name):
    with bz2.open(CACHE / name, "rt", encoding="utf-8") as fh:
        yield from csv.reader(fh, delimiter="\t", quoting=csv.QUOTE_NONE)


def audio_rows():
    with tarfile.open(CACHE / "sentences_with_audio.tar.bz2") as tar:
        member = next(m for m in tar.getmembers() if m.name.endswith(".csv"))
        text = io.TextIOWrapper(tar.extractfile(member), encoding="utf-8")
        yield from csv.reader(text, delimiter="\t", quoting=csv.QUOTE_NONE)


def pool(lo, hi):
    download()
    eng = {r[0]: r[2] for r in tsv_bz2("eng_sentences.tsv.bz2")}
    audio = {}
    for sid, audio_id, user, lic, attr in ((r + [""] * 5)[:5] for r in audio_rows()):
        if sid in eng and lic in OPEN and sid not in audio:
            audio[sid] = (audio_id, user, OPEN[lic], attr)
    links = {}
    for en_id, ru_id in tsv_bz2("eng-rus_links.tsv.bz2"):
        if en_id in audio:
            links.setdefault(en_id, []).append(ru_id)
    wanted = {r for ids in links.values() for r in ids}
    rus = {r[0]: r[2] for r in tsv_bz2("rus_sentences.tsv.bz2") if r[0] in wanted}
    n = 0
    with open(POOL, "w", encoding="utf-8", newline="") as out:
        w = csv.writer(out, delimiter="\t", lineterminator="\n")
        w.writerow(["sentence_id", "audio_id", "words", "en", "ru", "username", "license", "attribution_url"])
        for sid, (audio_id, user, lic, attr) in sorted(audio.items(), key=lambda kv: int(kv[0])):
            words = len(eng[sid].split())
            if not lo <= words <= hi:
                continue
            ru = " | ".join(rus[r] for r in links.get(sid, []) if r in rus)
            w.writerow([sid, audio_id, words, eng[sid], ru, user, lic, attr])
            n += 1
    print(f"{n} sentences → {POOL.relative_to(ROOT)}", file=sys.stderr)


def fetch(ids):
    rows = {r["sentence_id"]: r for r in csv.DictReader(open(POOL, encoding="utf-8"), delimiter="\t")}
    AUDIO.mkdir(parents=True, exist_ok=True)
    for sid in ids:
        r = rows.get(sid)
        if r is None:
            sys.exit(f"sentence {sid} is not in the pool (wrong id or not openly licensed)")
        dst = AUDIO / f"{r['audio_id']}.mp3"
        if not dst.exists():
            urllib.request.urlretrieve(f"https://tatoeba.org/audio/download/{r['audio_id']}", dst)
        src = {
            "title": f"Tatoeba #{sid}",
            "url": f"https://tatoeba.org/en/sentences/show/{sid}",
            "author": r["username"],
            "license": r["license"],
        }
        print(f"  - audio: audio/tatoeba/{dst.name}")
        print(f"    audio_source: {json.dumps(src, ensure_ascii=False)}")
        print(f"    answers: [{json.dumps(r['en'], ensure_ascii=False)}]")
        print(f"    explain: {json.dumps(r['ru'] or 'TODO: перевод и разбор', ensure_ascii=False)}")


def main():
    args = sys.argv[1:]
    if args[:1] == ["pool"]:
        opts = dict(zip(args[1::2], args[2::2]))
        pool(int(opts.get("--min", 6)), int(opts.get("--max", 20)))
    elif args[:1] == ["fetch"] and len(args) > 1:
        fetch(args[1:])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
