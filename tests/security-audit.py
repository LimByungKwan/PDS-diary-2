"""Scan source, reachable Git objects and generated output without printing secret values."""
from pathlib import Path
import hashlib, json, re, subprocess

root=Path(__file__).resolve().parents[1]
patterns={
 'openai_key':r'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}',
 'github_key':r'(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{24,})',
 'aws_access_key':r'(?:AKIA|ASIA)[A-Z0-9]{16}',
 'google_key':r'AIza[A-Za-z0-9_-]{30,}',
 'slack_key':r'xox[baprs]-[A-Za-z0-9-]{24,}',
 'private_key':r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
 'literal_credential':r'''(?i)(?:api[_-]?key|access[_-]?token|client[_-]?secret|authorization|bearer[_-]?token)\s*[:=]\s*["'][A-Za-z0-9+/_=-]{24,}["']''',
}
compiled={k:re.compile(v) for k,v in patterns.items()}
hits=[]
def scan(label,payload):
 text=payload.decode('utf-8',errors='replace')
 for name,pattern in compiled.items():
  for match in pattern.finditer(text):
   hits.append({'location':label,'pattern':name,'line':text[:match.start()].count('\n')+1})
tracked=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
source_files=0
for name in filter(None,tracked):
 p=root/name
 if p.is_file():scan('source/'+name,p.read_bytes());source_files+=1
objects=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=root).decode().splitlines()
seen=set();history_blobs=0
for line in objects:
 oid,_,name=line.partition(' ')
 if oid in seen:continue
 seen.add(oid)
 kind=subprocess.check_output(['git','cat-file','-t',oid],cwd=root).strip()
 if kind in (b'blob',b'commit'):
  scan('git/'+oid+('/'+name if name else ''),subprocess.check_output(['git','cat-file','-p',oid],cwd=root))
  if kind==b'blob':history_blobs+=1
build_files=0
if (root/'dist').exists():
 for p in sorted((root/'dist').rglob('*')):
  if p.is_file():scan('deploy/'+str(p.relative_to(root/'dist')),p.read_bytes());build_files+=1
page=(root/'components/diary.tsx').read_text()+(root/'app/login/page.tsx').read_text()
notice='로그인 전에는 기록을 표시하지 않습니다.'
report={'scope':'tracked working source, reachable Git blobs and commit messages, current dist build','source_files':source_files,'history_blobs':history_blobs,'build_files':build_files,'secret_patterns':list(patterns),'findings':hits,'protected_notice_present':notice in page,'unsafe_html_output_in_diary':any(x in page for x in ['dangerouslySetInnerHTML','innerHTML','eval(']),'storage':'server D1; GET/export requires a live session and filters by owner; no auth tables exported','pending':['Actual browser signup login logout and import by the user','Hosted HTTP checks after deployment','T07 public GitHub source upload']}
out=root/'tests/security-results.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['secret_patterns']},ensure_ascii=False))
raise SystemExit(1 if hits or not report['protected_notice_present'] or report['unsafe_html_output_in_diary'] else 0)
