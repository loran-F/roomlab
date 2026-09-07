"""Publish an explicit RoomLab release manifest through GitHub Contents API.

Default is a local dry run. Credentials are never written to the manifest or log.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
REPO = 'loran-F/roomlab'

def blob_sha(raw):
    return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()

def credential():
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if not token:
        location = ROOT.parent / '.github-token'
        if location.is_file():
            token = location.read_text(encoding='utf-8-sig').strip()
    return token

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', type=Path, required=True)
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--verify-pages', action='store_true')
    args = parser.parse_args()
    stage = args.stage.resolve()
    manifest = json.loads((stage/'release.json').read_text(encoding='utf-8'))
    files = []
    for name in manifest['files']:
        path = (stage/name).resolve()
        if not path.is_relative_to(stage) or not path.is_file():
            raise RuntimeError('Invalid release path: '+name)
        if path.name.startswith('.') or 'node_modules' in path.parts:
            raise RuntimeError('Disallowed release path: '+name)
        raw = path.read_bytes()
        files.append((name, raw, blob_sha(raw)))
    print(json.dumps({'release':manifest['release'], 'files':[{'path':n,'bytes':len(raw),'sha':sha} for n,raw,sha in files]}, ensure_ascii=False))
    if args.verify_pages:
        for name,raw,sha in files:
            url='https://loran-f.github.io/roomlab/'+urllib.parse.quote(name)+'?release='+str(int(time.time()))
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RoomLab-release'}), timeout=30) as response:
                actual=response.read()
            if actual!=raw:
                raise RuntimeError('Pages has not updated: '+name)
        print('PAGES VERIFIED: all release files match local bytes.')
        return
    if not args.publish:
        print('DRY RUN: no remote changes.')
        return
    token = credential()
    if not token:
        print('BLOCKED: GitHub write credential is missing.',file=sys.stderr)
        sys.exit(2)
    def api(name, body=None):
        url='https://api.github.com/repos/'+REPO+'/contents/'+urllib.parse.quote(name)
        if body is None:url+='?ref=main'
        headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'RoomLab-release','X-GitHub-Api-Version':'2022-11-28'}
        if body is not None:headers['Content-Type']='application/json'
        req=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers=headers,method='GET' if body is None else 'PUT')
        try:
            with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code==404 and body is None:return None
            raise RuntimeError('GitHub HTTP '+str(error.code)+' for '+name) from None
    local = {n:sha for n,raw,sha in files}
    for name,expected in manifest.get('expected_base',{}).items():
        remote=api(name)
        if not remote or remote['sha'] not in (expected,local.get(name)):
            raise RuntimeError('Remote changed since preparation: '+name)
    results=[]
    for name,raw,sha in files:
        remote=api(name)
        if remote and remote['sha']==sha:
            results.append({'path':name,'sha':sha,'status':'unchanged'})
            print('UNCHANGED '+name)
            continue
        body={'message':manifest['release']+'：'+name,'content':base64.b64encode(raw).decode(),'branch':'main'}
        if remote:body['sha']=remote['sha']
        result=api(name,body)
        if result['content']['sha']!=sha:raise RuntimeError('Uploaded SHA mismatch: '+name)
        results.append({'path':name,'sha':sha,'commit':result['commit']['sha'],'status':'published'})
        print('PUBLISHED '+name+' '+result['commit']['sha'])
    (stage/'published.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print('GITHUB VERIFIED: release uploaded. Verify Pages separately after its build completes.')

if __name__=='__main__':
    try:main()
    except (RuntimeError,urllib.error.URLError) as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
