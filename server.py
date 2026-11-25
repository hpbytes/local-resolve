from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import sqlite3, json, secrets, hashlib, hmac, base64, re, datetime, os
from http.cookies import SimpleCookie
ROOT=Path(__file__).resolve().parent
os.chdir(ROOT)
DB=ROOT/'localresolve.db'
CATS={'Roads & Traffic':'Roads Department','Garbage & Sanitation':'Sanitation Department','Water & Drainage':'Water Supply & Drainage','Streetlights & Electricity':'Electrical Maintenance','Other Civic Issues':'General Administration'}
LOCS=['Kuniamuthur, Coimbatore','Gandhipuram, Coimbatore','Peelamedu, Coimbatore']
def now(): return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
def db():
 c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c
def password(p,s):return hashlib.pbkdf2_hmac('sha256',p.encode(),bytes.fromhex(s),210000).hex()
def add_user(c,name,email,p,role='citizen'):
 s=secrets.token_hex(16);return c.execute('INSERT INTO users(name,email,salt,pw,role) VALUES(?,?,?,?,?)',(name,email,s,password(p,s),role)).lastrowid
def add_report(c,owner,title,cat,loc,street,desc,status='Reported',media=None,lat=None,lon=None):
 n=c.execute('INSERT INTO reports(owner,title,category,department,locality,street,description,status,media,lat,lon,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(owner,title,cat,CATS[cat],loc,street,desc,status,media,lat,lon,now())).lastrowid
 rid=f'LR-{datetime.date.today().year}-{n:06d}';c.execute('UPDATE reports SET id=? WHERE seq=?',(rid,n));c.execute('INSERT INTO history(report,status,note,created) VALUES(?,?,?,?)',(rid,'Reported','Complaint submitted and department assigned.',now()));
 if status!='Reported':c.execute('INSERT INTO history(report,status,note,created) VALUES(?,?,?,?)',(rid,status,'Illustrative demo status update.',now()))
 return rid
def init():
 with db() as c:
  c.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,email TEXT UNIQUE,salt TEXT,pw TEXT,role TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user INTEGER REFERENCES users(id),expires INTEGER); CREATE TABLE IF NOT EXISTS reports(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,owner INTEGER REFERENCES users(id),title TEXT,category TEXT,department TEXT,locality TEXT,street TEXT,description TEXT,status TEXT,media TEXT,lat REAL,lon REAL,created TEXT); CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,report TEXT REFERENCES reports(id),status TEXT,note TEXT,created TEXT); CREATE TABLE IF NOT EXISTS confirmations(report TEXT REFERENCES reports(id),user INTEGER REFERENCES users(id),PRIMARY KEY(report,user));''')
  if not c.execute('SELECT 1 FROM users').fetchone():
   uid=add_user(c,'Demo Citizen','citizen@demo.local','LocalDemo123!');add_user(c,'Demo Officer','officer@demo.local','LocalDemo123!','officer');add_user(c,'Demo Administrator','admin@demo.local','LocalDemo123!','admin')
   for title,cat,loc,street,desc,status in [('Damaged road near bus stop','Roads & Traffic',LOCS[0],'Main Road','Sample report: uneven road surface near a bus stop.','In Progress'),('Garbage awaiting collection','Garbage & Sanitation',LOCS[0],'Market Street','Sample report: waste accumulation near the roadside.','Under Review'),('Streetlight not working','Streetlights & Electricity',LOCS[0],'Residential Lane','Sample report: streetlight does not illuminate at night.','Resolved'),('Water leakage near junction','Water & Drainage',LOCS[1],'Main Junction','Sample report: water leakage along the pavement.','Reported')]:add_report(c,uid,title,cat,loc,street,desc,status)
def public_user(row):return {k:row[k] for k in ('id','name','role')} if row else None
def listing(c,r,detail=False):
 d={k:r[k] for k in ('id','owner','title','category','department','locality','street','description','status','lat','lon','created')};d['confirmations']=c.execute('SELECT COUNT(*) FROM confirmations WHERE report=?',(r['id'],)).fetchone()[0]
 if detail:d['media']=r['media'];d['history']=[dict(h) for h in c.execute('SELECT status,note,created FROM history WHERE report=? ORDER BY id',(r['id'],))]
 return d
class Handler(SimpleHTTPRequestHandler):
 def send_json(self,data,status=200,cookie=None):
  b=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');
  if cookie:self.send_header('Set-Cookie',cookie)
  self.end_headers();self.wfile.write(b)
 def token(self):
  try:return SimpleCookie(self.headers.get('Cookie',''))['lr_session'].value
  except KeyError:return ''
 def user(self,c):return c.execute('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user WHERE token=? AND expires>?',(self.token(),int(datetime.datetime.now().timestamp()))).fetchone()
 def do_GET(self):
  path=self.path.split('?')[0]
  if not path.startswith('/api/'):
   if path not in ('/','/index.html','/style.css','/app.js'):self.send_error(404);return
   return super().do_GET()
  with db() as c:
   if path=='/api/session':return self.send_json(public_user(self.user(c)))
   if path=='/api/reports':return self.send_json([listing(c,r) for r in c.execute('SELECT * FROM reports ORDER BY seq DESC')])
   if path.startswith('/api/reports/'):
    r=c.execute('SELECT * FROM reports WHERE id=?',(path.split('/')[-1],)).fetchone();return self.send_json(listing(c,r,True) if r else {'error':'No matching report ID.'},200 if r else 404)
  self.send_json({'error':'Not found'},404)
 def do_POST(self):
  try:
   if self.headers.get('Origin') and self.headers['Origin'] not in ('http://'+self.headers.get('Host',''),'https://'+self.headers.get('Host','')):return self.send_json({'error':'Invalid origin'},403)
   size=int(self.headers.get('Content-Length',0));
   if size>12*1024*1024:return self.send_json({'error':'Upload too large'},413)
   d=json.loads(self.rfile.read(size));path=self.path.removeprefix('/api/')
   with db() as c:
    if path in ('login','register'):
     email=str(d.get('email','')).strip().lower();p=str(d.get('password',''))
     if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or not 8<=len(p)<=200:raise ValueError('Enter a valid email and password (8–200 characters).')
     if path=='register':
      name=str(d.get('name','')).strip();
      if not 1<=len(name)<=80:raise ValueError('Enter your name.')
      if c.execute('SELECT 1 FROM users WHERE email=?',(email,)).fetchone():raise ValueError('Email already registered.')
      add_user(c,name,email,p)
     u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
     if not u or not hmac.compare_digest(password(p,u['salt']),u['pw']):return self.send_json({'error':'Invalid email or password'},401)
     token=secrets.token_urlsafe(32);c.execute('INSERT INTO sessions VALUES(?,?,?)',(token,u['id'],int(datetime.datetime.now().timestamp())+86400));c.commit();return self.send_json(public_user(u),cookie=f'lr_session={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400')
    if path=='logout':c.execute('DELETE FROM sessions WHERE token=?',(self.token(),));return self.send_json({'ok':True},cookie='lr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
    u=self.user(c)
    if not u:return self.send_json({'error':'Sign in required'},401)
    if path=='reports':
     if u['role']!='citizen':return self.send_json({'error':'Citizen access required'},403)
     cat=d.get('category');loc=d.get('locality');title=str(d.get('title','')).strip();street=str(d.get('street','')).strip();desc=str(d.get('description','')).strip()
     if cat not in CATS or loc not in LOCS or not (1<=len(title)<=100 and 1<=len(street)<=200 and 1<=len(desc)<=2000):raise ValueError('Complete all required report fields.')
     media=d.get('media');lat=lon=None
     if media:
      m=re.fullmatch(r'data:(image/jpeg|image/png|image/webp|video/mp4);base64,([A-Za-z0-9+/=]+)',media)
      if not m:raise ValueError('Unsupported file type.')
      raw=base64.b64decode(m[2],validate=True);kind=m[1];valid={'image/jpeg':raw.startswith(b'\xff\xd8\xff'),'image/png':raw.startswith(b'\x89PNG\r\n\x1a\n'),'image/webp':raw[:4]==b'RIFF' and raw[8:12]==b'WEBP','video/mp4':raw[4:8]==b'ftyp'}[kind]
      if len(raw)>8*1024*1024 or not valid:raise ValueError('Invalid or oversized evidence file.')
     if d.get('lat') and d.get('lon'):
      lat,lon=float(d['lat']),float(d['lon']);
      if not (-90<=lat<=90 and -180<=lon<=180):raise ValueError('Invalid coordinates.')
     rid=add_report(c,u['id'],title,cat,loc,street,desc,media=media,lat=lat,lon=lon);c.commit();return self.send_json({'id':rid},201)
    r=c.execute('SELECT * FROM reports WHERE id=?',(d.get('id'),)).fetchone()
    if not r:return self.send_json({'error':'Report not found'},404)
    if path=='confirm':
     if u['role']!='citizen':return self.send_json({'error':'Citizen access required'},403)
     if r['owner']==u['id']:raise ValueError('You cannot confirm your own report.')
     if c.execute('SELECT 1 FROM confirmations WHERE report=? AND user=?',(r['id'],u['id'])).fetchone():raise ValueError('You already confirmed this report.')
     c.execute('INSERT INTO confirmations VALUES(?,?)',(r['id'],u['id']));return self.send_json({'ok':True})
    status=d.get('status');note=str(d.get('note','')).strip()
    if path=='update':
     if u['role'] not in ('officer','admin'):return self.send_json({'error':'Officer access required'},403)
     allowed={'Reported':['Under Review','Rejected'],'Under Review':['Verified','Rejected'],'Verified':['In Progress','Rejected'],'In Progress':['Resolved'],'Reopened':['Under Review','In Progress'],'Resolved':[],'Closed':[],'Rejected':[]}
     if status not in allowed.get(r['status'],[]):raise ValueError('Invalid status transition. Follow the workflow in order.')
    elif path=='feedback':
     if u['id']!=r['owner'] or r['status']!='Resolved' or status not in ('Closed','Reopened'):return self.send_json({'error':'Feedback unavailable'},403)
    else:return self.send_json({'error':'Not found'},404)
    if not 1<=len(note)<=2000:raise ValueError('Enter update notes (1–2000 characters).')
    c.execute('UPDATE reports SET status=? WHERE id=?',(status,r['id']));c.execute('INSERT INTO history(report,status,note,created) VALUES(?,?,?,?)',(r['id'],status,note,now()));c.commit();return self.send_json({'ok':True})
  except (ValueError,TypeError,KeyError,sqlite3.IntegrityError) as e:self.send_json({'error':str(e)},400)
if __name__=='__main__':
 init();print('Local Resolve: http://127.0.0.1:8000',flush=True);ThreadingHTTPServer(('127.0.0.1',8000),Handler).serve_forever()
