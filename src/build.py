#!/usr/bin/env python3
"""Builds the WrenchNow site into an output folder:
   marketing pages at the root, the existing app at /app/, legal pages generated from the app's own legal text."""
import json, hashlib, os, re, shutil, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import services_content as SC

HERE = os.path.dirname(os.path.abspath(__file__))
APP_SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/site/wrenchnow_app_v19.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/site/deploy19'
PWA = '/home/claude/work/patch8/pwa'
SITE = 'https://getwrenchnow.com'

if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT + '/assets'); os.makedirs(OUT + '/app')

def fingerprint(name, data):
    h = hashlib.sha1(data.encode()).hexdigest()[:8]
    base, ext = os.path.splitext(name)
    fn = f'{base}.{h}{ext}'
    open(f'{OUT}/assets/{fn}', 'w').write(data)
    return '/assets/' + fn
CSS = fingerprint('site.css', open(HERE + '/site.css').read())
JS = fingerprint('site.js', open(HERE + '/site.js').read())

# ── icons (simple strokes, currentColor) ──
def ic(path, size=22):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path}</svg>'
I = {
  'check': ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 18),
  'pin': ic('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  'tag': ic('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  'shield': ic('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  'card': ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>'),
  'star': ic('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z"/>'),
  'flag': ic('<path d="M5 21V4h11l-1.5 4L16 12H5"/>'),
  'menu': ic('<path d="M4 7h16M4 12h16M4 17h16"/>'),
}

NAV = [('/services/', 'Services'), ('/how-it-works', 'How it works'), ('/mechanics', 'For mechanics'), ('/pricing', 'Pricing'), ('/about', 'About')]
APP_HASHES = ['card-saved=', 'card-cancelled=', 'payouts-done', 'payouts-retry', 'mechanic=', 'quote', 'jobs', 'apply']

LD = '<script type="application/ld+json">' + json.dumps([
    {"@context": "https://schema.org", "@type": "WebSite", "name": "WrenchNow", "alternateName": ["Wrench Now", "WrenchNow mobile mechanics", "getwrenchnow"], "url": SITE + "/"},
    {"@context": "https://schema.org", "@type": "Organization", "name": "WrenchNow", "alternateName": "Wrench Now", "url": SITE + "/", "logo": SITE + "/icon-512.png", "email": "hello@getwrenchnow.com", "areaServed": "US"},
]) + '</script>'

def page(path, title, desc, body, active='', head=''):
    links = ''.join(f'<a href="{h}"{" aria-current=page" if h == active else ""}>{t}</a>' for h, t in NAV)
    canon = SITE + (path if path != '/index' else '/')
    fwd = "(function(){function f(){var h=location.hash.slice(1);if(!h)return;var k=" + str(APP_HASHES).replace("'", '"') + ";for(var i=0;i<k.length;i++){if(h===k[i]||(k[i].slice(-1)==='='&&h.indexOf(k[i])===0)){location.replace('/app/'+location.search+'#'+h);return}}}f();addEventListener('hashchange',f)})();"
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#131416">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/icon-512.png">
<meta property="og:site_name" content="WrenchNow">
{LD if path == '/index' else ''}{head}<link rel="icon" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script>{fwd}</script>
<link rel="preload" href="/fonts/saira-condensed-extrabold.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/saira-var.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="{CSS}">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap">
    <a class="brand" href="/" aria-label="WrenchNow home"><img src="/icon-192.png" alt="" width="34" height="34"><span>WRENCH <b>NOW</b></span></a>
    <nav class="nav-links" aria-label="Main">{links}</nav>
    <div class="nav-cta"><a class="btn btn-quiet btn-sm" href="/app/">Log in</a><a class="btn btn-primary btn-sm" href="/app/">Get quotes</a></div>
    <button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false">{I['menu']}</button>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="foot">
  <div class="wrap">
    <div>
      <a class="brand" href="/"><img src="/icon-192.png" alt="" width="34" height="34"><span>WRENCH <b>NOW</b></span></a>
      <p style="margin-top:14px;max-width:34ch">Mobile mechanics who come to you, with upfront quotes and payment through the app.</p>
      <p style="margin-top:14px">WrenchNow, Denver, Colorado<br><a href="mailto:hello@getwrenchnow.com">hello@getwrenchnow.com</a></p>
    </div>
    <div><h4>Drivers</h4><ul><li><a href="/app/">Get quotes</a></li><li><a href="/how-it-works">How it works</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/app/">My bookings</a></li></ul></div>
    <div><h4>Services</h4><ul>{''.join(f'<li><a href="/services/{x["slug"]}">{x["name"]}</a></li>' for x in SC.SERVICES[:6])}<li><a href="/services/">All services</a></li></ul></div>
    <div><h4>Mechanics</h4><ul><li><a href="/mechanics">Why join</a></li><li><a href="/app/#apply">Apply</a></li><li><a href="/app/#jobs">My jobs</a></li><li><a href="/pricing#mechanics">Fees</a></li></ul></div>
    <div><h4>Company</h4><ul><li><a href="/about">About</a></li><li><a href="/fleet">Business vehicles</a></li><li><a href="/terms">Terms of Service</a></li><li><a href="/privacy">Privacy Policy</a></li><li><a href="/mechanic-agreement">Mechanic Agreement</a></li></ul></div>
    <div class="legalline">© 2026 WrenchNow. Launching in Denver, with more cities as mechanics join.</div>
  </div>
</footer>
<script src="{JS}" defer></script>
</body>
</html>'''

def ticket_quote():
    return '''<figure class="ticket" aria-label="Example quote">
  <div class="t-head">
    <div><div class="t-kind">Example quote</div><div class="t-job">Front brake pads &amp; rotors</div><div class="t-car">2018 Honda Civic, at your driveway</div></div>
    <div class="t-stamp">Upfront price</div>
  </div>
  <ul class="t-rows num">
    <li><span>Labor, 2.0 hours</span><span>$180.00</span></li>
    <li><span>Parts</span><span>$95.50</span></li>
  </ul>
  <div class="t-total num"><span>Your quote</span><b>$275.50</b></div>
  <div class="t-dealer num"><span>Typical dealer, same job</span><s>≈ $495</s></div>
  <div class="t-save num"><span>You save about</span><span>$220</span></div>
  <figcaption class="t-note">Every quote shows labor and parts separately. The dealer estimate uses a typical dealer labor rate and parts markup for the same hours and parts.</figcaption>
</figure>'''

def ticket_payout(title='A $200 job, paid through the app'):
    return f'''<figure class="ticket" aria-label="Payout example">
  <div class="t-head">
    <div><div class="t-kind">Payout example</div><div class="t-job">{title}</div><div class="t-car">Paid to your bank by Stripe</div></div>
    <div class="t-stamp">No required monthly fee</div>
  </div>
  <ul class="t-rows num">
    <li><span>Customer pays</span><span>$200.00</span></li>
    <li><span>WrenchNow fee, 5%</span><span>−$10.00</span></li>
    <li><span>Card processing</span><span>−$6.95</span></li>
    <li><span>Onboarding, first jobs only</span><span>−$10.00</span></li>
  </ul>
  <div class="t-total num"><span>You receive</span><b>$173.05</b></div>
  <div class="t-save num"><span>Once onboarding is paid</span><span>$183.05</span></div>
  <figcaption class="t-note">Card processing is 3.2% + 55¢ and covers Stripe's card and payout costs. The onboarding fee repays your background check: up to $10 a job, never more than 15% of a job, $50 in total.</figcaption>
</figure>'''

FAQ = SC.HOME_FAQ_EXTRA[:1] + [
 ("Does it cost anything to ask for quotes?", "No. Requesting and comparing quotes is free. You pay the price you accept, and nothing more unless you approve a change."),
 ("When is my card charged?", "Your card is saved securely by Stripe when you accept a quote. It's charged the final approved price after the job: when you press Confirm and pay, or 48 hours after your mechanic marks the job done. Report a problem before then and the payment is held."),
 ("What if the mechanic finds more work?", "They send a revised price through the app with the reason. You approve or reject it on your phone. If you reject it, the original price stands."),
 ("Who sees my address?", "Mechanics who quote see your ZIP code and rough area only. Your street address and phone go to the one mechanic whose quote you accept."),
 ("How are mechanics checked?", "Every mechanic passes a third-party background and driving-record check before their profile goes live. Full-service mechanics also show ASE certification or references. Mechanics with verified liability insurance carry an Insured badge. Checks lower the risk but can't guarantee future conduct; the Terms of Service explain the details."),
 ("What if the mechanic doesn't show up?", "Report it from My bookings after the appointment time. You aren't charged, and missed appointments appear on the mechanic's profile and lower their ranking."),
 *SC.HOME_FAQ_EXTRA[1:],
 ("Can I cancel?", "Yes, free, any time before work starts, and your card isn't charged. If you booked a paid diagnosis and the mechanic has already done it, the diagnosis price is still due."),
 ("Who pays for parts?", "Parts are included in the quote unless it says otherwise, and the mechanic brings them. If you'd rather supply your own, say so in your request. You can also ask to keep the old parts that are replaced."),
 ("Is the work guaranteed?", "Each mechanic sets their own warranty on parts and labor, shown on their profile and your receipt. If something goes wrong, report it in the app before you're charged and the payment is held while we sort it out."),
 ("Where is WrenchNow available?", "We're launching in the Denver area and adding cities as mechanics join. Each mechanic sets how far they travel, and you'll only see mechanics who cover your address. If none do yet, send your request anyway and we'll try to find you one."),
]
def faq_html(items):
    return '<div class="faq">' + ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in items) + '</div>'

SERVICES = ['Oil change', 'Brakes', 'Battery', 'Check engine light', 'Starter or alternator', 'Tires and rotation', 'Inspection', 'Cooling system', 'Suspension', 'AC and heat']

# ── home ──
home = f'''
<section class="hero">
  <div class="wrap">
    <div>
      <h1>Car repair that comes to you.</h1>
      <p class="lede">Tell us what your car needs. Background-checked mobile mechanics send upfront quotes, you pick one, and they fix it in your driveway, parking lot or office.</p>
      <form class="quick" action="/app/" method="get">
        <label class="field"><span>What does your car need?</span><input name="service" list="svcList" placeholder="Brakes, oil change…" autocomplete="off"></label>
        <label class="field"><span>ZIP or city</span><input name="loc" placeholder="80202" autocomplete="postal-code"></label>
        <button class="btn btn-primary" type="submit">Get quotes</button>
        <datalist id="svcList">{''.join(f'<option value="{s}">' for s in SERVICES)}<option value="Not sure what's wrong"></datalist>
      </form>
      <div class="reassure"><span>{I['check']}Free to request</span><span>{I['check']}Pay after the work</span><span>{I['check']}Address private until you book</span></div>
    </div>
    {ticket_quote()}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2>Three steps, no waiting room</h2><p>You stay home. The mechanic brings the tools.</p></div>
    <ol class="steps">
      <li><h3>Describe the problem</h3><p>"Grinding when I brake" is plenty. Add photos if you like and pick the days that work.</p></li>
      <li><h3>Compare quotes</h3><p>Ask up to three mechanics you choose, or send it to every mechanic nearby. Each quote lists labor, parts and a time.</p></li>
      <li><h3>Get it fixed, then pay</h3><p>Your mechanic comes to you. Your card is charged the agreed price after the job is done.</p></li>
    </ol>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2>Protections built into every booking</h2><p>The rules are in the app, not in a promise.</p></div>
    <div class="protect">
      <div>{I['tag']}<h3>The price is agreed first</h3><p>Quotes show labor and parts. Any change has to be approved by you on your phone before extra work starts.</p></div>
      <div>{I['pin']}<h3>Your address stays private</h3><p>Mechanics quoting see your ZIP only. The mechanic you book gets your address and phone.</p></div>
      <div>{I['card']}<h3>Pay after the work</h3><p>Your card is saved by Stripe and charged when the job is done. Report a problem and the payment is held.</p></div>
      <div>{I['shield']}<h3>Background-checked mechanics</h3><p>Every mechanic passes a background and driving-record check. Insured mechanics carry their own badge.</p></div>
      <div>{I['star']}<h3>Reviews from real jobs only</h3><p>Only customers who paid for a job through WrenchNow can review it. Rankings weigh reviews, reliability and experience.</p></div>
      <div>{I['flag']}<h3>No-shows are on the record</h3><p>If a mechanic misses your appointment, you pay nothing and it shows on their profile.</p></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap svc-wrap">
    <div>
      <div class="section-head" style="margin-bottom:24px"><h2>Mobile mechanic services</h2><p>On-site car maintenance and repair: most jobs that don't need a lift, done at your home, office or wherever the car is parked.</p></div>
      <ul class="svc">{''.join(f'<li><a href="/services/{x["slug"]}">{x["name"]}</a></li>' for x in SC.SERVICES)}</ul>
    </div>
    <div class="unsure">
      <h3>Not sure what's wrong?</h3>
      <p>Describe what you hear, see or smell. Mechanics quote a diagnosis visit, and some offer it free. Once they know the problem, the repair price comes to your phone for approval.</p>
      <a class="btn btn-primary" href="/app/?service=Not+sure+what%27s+wrong">Ask for a diagnosis</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap band">
    <div>
      <h2>Mechanics keep more of every job</h2>
      <p class="lede">Set your own prices, pick your jobs and get paid to your bank. No shop rent, no lead fees, no required monthly fee.</p>
      <ul class="checks">
        <li>{I['check']}<span>5% platform fee per job, plus card processing</span></li>
        <li>{I['check']}<span>Free to join: your background check is repaid from your first jobs</span></li>
        <li>{I['check']}<span>Basic maintenance or full repair, your choice</span></li>
      </ul>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-primary" href="/app/#apply">Apply as a mechanic</a><a class="btn btn-quiet" href="/mechanics">How it works for mechanics</a></div>
    </div>
    {ticket_payout()}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2>Common questions</h2></div>
    {faq_html(FAQ)}
  </div>
</section>

<section class="close-cta">
  <div class="wrap">
    <h2>Skip the shop this time.</h2>
    <div class="actions"><a class="btn btn-primary" href="/app/">Get quotes</a><a class="btn btn-quiet" href="/how-it-works">See how it works</a></div>
  </div>
</section>'''

# ── how it works ──
how = f'''
<section class="page-head"><div class="wrap"><h1>How WrenchNow works</h1><p class="lede">From "my car is making a noise" to paid and done, without leaving home.</p></div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><h2>For drivers</h2></div>
  <ol class="steps">
    <li><h3>Request quotes</h3><p>Describe the job, add your car and up to three photos, and choose up to three days and times of day. Send it to mechanics you pick, or to everyone nearby who does that work. Requests stay open for three days.</p></li>
    <li><h3>Compare and accept</h3><p>Quotes arrive in My bookings, cheapest first, each with labor, parts, a day and time, and an estimate of what a dealer would charge. Accept one and Stripe saves your card. Nothing is charged yet.</p></li>
    <li><h3>Job done, then pay</h3><p>The mechanic comes to you. If more work is needed, they send a revised price that you approve or reject. After the job, confirm and pay, or let it charge automatically after 48 hours.</p></li>
  </ol>
</div></section>
<section class="section"><div class="wrap split">
  <div class="prose">
    <h2 style="margin-top:0">When something goes wrong</h2>
    <p><strong>A problem with the work.</strong> Press Report a problem before you're charged. The payment is held while we talk to you both.</p>
    <p><strong>The mechanic didn't come.</strong> Report the no-show after the appointment time. You pay nothing, and it's recorded on their profile.</p>
    <p><strong>Asked to pay in cash or Venmo.</strong> Paying outside WrenchNow loses your protections, and it breaks the mechanic's agreement. Use "Asked to pay outside WrenchNow?" on the booking and we'll follow up.</p>
    <p><strong>A refund.</strong> Refunds are decided after hearing from both sides, and go back to your card through Stripe.</p>
  </div>
  <div class="prose">
    <h2 style="margin-top:0">Your car's history, kept for you</h2>
    <p>Every booking adds to My car: what was done, when, and at what mileage. WrenchNow tracks common service intervals and can email you when something is due.</p>
    <p>Mechanics can attach an inspection report that marks each item good, due soon or needs attention now. Anything flagged shows up on your list, ready to book.</p>
  </div>
</div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><h2>For mechanics</h2><p>One-time setup, then quote the jobs you want.</p></div>
  <ol class="steps">
    <li><h3>Apply and get checked</h3><p>Apply with your experience and the work you do. You'll get a background and driving-record check invite by email. Full-service mechanics also share ASE certification or two references.</p></li>
    <li><h3>Set up payouts</h3><p>Connect your bank through Stripe once. Then set your rate, travel distance and whether you offer free diagnosis.</p></li>
    <li><h3>Quote, work, get paid</h3><p>Quote requests near you show up in My jobs. When a customer accepts, you get their address and phone. Payment goes to your bank after the job.</p></li>
  </ol>
  <p style="margin-top:32px"><a class="btn btn-primary" href="/mechanics">Fees and requirements for mechanics</a></p>
</div></section>
<section class="close-cta"><div class="wrap"><h2>Ready when your car is.</h2><div class="actions"><a class="btn btn-primary" href="/app/">Get quotes</a></div></div></section>'''

# ── mechanics ──
mech = f'''
<section class="page-head"><div class="wrap split" style="align-items:center">
  <div><h1>Your tools, your prices, your schedule</h1><p class="lede">WrenchNow sends you jobs near you. You quote what the work is worth, the customer pays through the app, and Stripe sends your share to your bank.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px"><a class="btn btn-primary" href="/app/#apply">Apply now</a><a class="btn btn-quiet" href="/app/#jobs">Mechanic log in</a></div></div>
  {ticket_payout()}
</div></section>
<section class="section"><div class="wrap split">
  <div>
    <h2>What you pay</h2>
    <ul class="lines">
      <li><span>Joining<small>Free for founding mechanics</small></span><span>$0</span></li>
      <li><span>Platform fee<small>On each job paid through WrenchNow</small></span><span>5%</span></li>
      <li><span>Card processing<small>Covers Stripe's card and payout costs</small></span><span>3.2% + 55¢</span></li>
      <li><span>Onboarding<small>Repays your background check from your first paid jobs: up to $10 a job, never more than 15% of a job</small></span><span>$50 total</span></li>
      <li><span>Sponsored placement<small>Optional. Shown in a row labeled Sponsored above results when you match the search. Cancel anytime.</small></span><span>$29/mo</span></li>
    </ul>
    <p class="small" style="margin-top:14px">No required monthly fee, no lead fees, no charge to quote. All fees are set out in the Mechanic Agreement.</p>
  </div>
  <div>
    <h2>What you could make</h2>
    <div class="calc">
      <label for="cHours"><span>Booked hours a week</span><b id="cHoursV" class="num">15</b></label>
      <input id="cHours" type="range" min="2" max="50" value="15">
      <label for="cRate"><span>Your hourly rate</span><b id="cRateV" class="num">$80</b></label>
      <input id="cRate" type="range" min="40" max="160" step="5" value="80">
      <div><output id="cOut" class="num" for="cHours cRate">$4,780</output><p class="small">a month after WrenchNow's 5% and card processing, before parts, fuel and taxes. How much you book depends on demand in your area; we can't guarantee work.</p></div>
    </div>
  </div>
</div></section>
<section class="section"><div class="wrap split">
  <div>
    <h2>Two ways to join</h2>
    <div class="tiers">
      <div class="tier"><h3>Basic maintenance</h3><p>Oil changes, batteries, tires and rotation, filters, bulbs, wipers, fluid top-offs and jump starts. No certification needed.</p></div>
      <div class="tier"><h3>Full-service repair</h3><p>Brakes, diagnostics, starters and alternators, cooling, suspension and more. Needs ASE certification or three years of experience with references.</p></div>
    </div>
  </div>
  <div>
    <h2>What you need</h2>
    <ul class="checks">
      <li>{I['check']}<span>Your own tools and transportation</span></li>
      <li>{I['check']}<span>A clean background and driving-record check, run by our screening partner</span></li>
      <li>{I['check']}<span>A bank account for Stripe payouts</span></li>
      <li>{I['check']}<span>Liability insurance is optional, and earns an Insured badge that ranks you higher</span></li>
    </ul>
    <h3 style="margin-top:28px">How you rank</h3>
    <p class="small" style="font-size:16px;color:var(--soft)">Best match weighs your reviews most, then showing up for booked jobs, jobs completed, verification and insurance. Only jobs paid through WrenchNow count. Missed appointments and cancellations within 24 hours are shown on your profile. Sponsored placement is labeled and shown separately; it never changes your best-match rank.</p>
  </div>
</div></section>
<section class="close-cta"><div class="wrap"><h2>Start getting jobs near you.</h2><div class="actions"><a class="btn btn-primary" href="/app/#apply">Apply now</a></div></div></section>'''

# ── pricing ──
pricing = f'''
<section class="page-head"><div class="wrap"><h1>Pricing, in full</h1><p class="lede">What drivers pay, what mechanics pay, and where the money goes.</p></div></section>
<section class="section"><div class="wrap price-grid">
  <div class="price-card" id="drivers">
    <h2>Drivers</h2>
    <ul class="lines">
      <li><span>Requesting and comparing quotes</span><span>Free</span></li>
      <li><span>The job<small>The price on the quote you accept: labor plus parts</small></span><span>Quoted price</span></li>
      <li><span>Booking fee</span><span>$0</span></li>
      <li><span>Diagnosis visit<small>Free or a set fee, shown on the mechanic's profile and quote</small></span><span>Varies</span></li>
      <li><span>Price changes<small>Only if you approve them in the app</small></span><span>Your call</span></li>
      <li><span>Cancelling<small>Any time before work starts. A completed paid diagnosis is still due.</small></span><span>$0</span></li>
    </ul>
    <p class="small" style="margin-top:16px">Your card is charged after the job. Quotes include an estimate of what a typical dealer would charge for the same work.</p>
  </div>
  <div class="price-card" id="mechanics">
    <h2>Mechanics</h2>
    <ul class="lines">
      <li><span>Joining<small>Free for founding mechanics</small></span><span>$0</span></li>
      <li><span>Platform fee per job</span><span>5%</span></li>
      <li><span>Card processing<small>Stripe's card and payout costs</small></span><span>3.2% + 55¢</span></li>
      <li><span>Onboarding<small>From your first paid jobs, up to $10 each, max 15% of a job</small></span><span>$50 total</span></li>
      <li><span>Sponsored placement<small>Optional, cancel anytime</small></span><span>$29/mo</span></li>
    </ul>
    <p class="small" style="margin-top:16px">When the founding offer ends, new mechanics pay a one-time $49 verification fee instead of the onboarding fee.</p>
  </div>
</div></section>
<section class="section"><div class="wrap band">
  <div><h2>Where $200 goes</h2><p class="lede">Most of every job goes to the mechanic who did the work. WrenchNow keeps 5%, and card processing covers what Stripe charges to move the money.</p></div>
  {ticket_payout('A $200 brake job')}
</div></section>
<section class="close-cta"><div class="wrap"><h2>No surprises on either side.</h2><div class="actions"><a class="btn btn-primary" href="/app/">Get quotes</a><a class="btn btn-quiet" href="/app/#apply">Apply as a mechanic</a></div></div></section>'''

# ── fleet ──
fleet = '''
<section class="page-head"><div class="wrap"><h1>Mobile mechanics for business vehicles</h1><p class="lede">Keep your work trucks, vans and company cars on the road. Mechanics come to your lot or job site, so vehicles aren't sitting at a shop and drivers aren't sitting in a waiting room.</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px"><a class="btn btn-primary" href="mailto:hello@getwrenchnow.com?subject=Fleet%20maintenance">Email us about your vehicles</a><a class="btn btn-quiet" href="/app/">Book a single job</a></div></div></section>
<section class="section"><div class="wrap prose">
  <h2 style="margin-top:0">What it covers</h2>
  <ul>
    <li><strong>Routine maintenance on site:</strong> oil changes, filters, batteries, brakes, tire rotations and inspections, done at your lot.</li>
    <li><strong>Repairs where the vehicle is:</strong> starters, alternators, belts, cooling and diagnostics, without a tow when the job allows it.</li>
    <li><strong>Upfront prices:</strong> every job is quoted before work starts, and any change needs your approval in the app.</li>
    <li><strong>Itemized receipts:</strong> each job comes with an emailed receipt listing labor and parts, for your books.</li>
  </ul>
  <h2>How it works</h2>
  <p>Tell us how many vehicles you run, what they are and where they're parked. We'll line up background-checked mobile mechanics near you who do that work. Each job is quoted and paid through WrenchNow, the same as any booking.</p>
  <p>We're starting in the Denver area. Email <a href="mailto:hello@getwrenchnow.com?subject=Fleet%20maintenance">hello@getwrenchnow.com</a> with your vehicles and location.</p>
</div></section>'''

# ── about ──
about = '''
<section class="page-head"><div class="wrap"><h1>A fairer way to get your car fixed</h1><p class="lede">WrenchNow is a Denver company connecting drivers with independent mobile mechanics.</p></div></section>
<section class="section"><div class="wrap prose">
  <h2 style="margin-top:0">Why we built it</h2>
  <p>Getting a car fixed usually means a morning in a waiting room, a price you can't compare, and a shop markup on every hour and every part. Meanwhile, skilled mechanics who work for themselves spend their time chasing customers and payments.</p>
  <p>WrenchNow puts the two together. Drivers get upfront quotes from mechanics who come to them. Mechanics set their own prices, keep most of every job, and get paid through the app.</p>
  <h2>What we stand behind</h2>
  <ul>
    <li><strong>Prices agreed before work starts.</strong> Changes need the customer's approval in the app.</li>
    <li><strong>Checked mechanics.</strong> Every mechanic passes a background and driving-record check before they can take jobs.</li>
    <li><strong>Honest reviews.</strong> Only paid jobs booked here can be reviewed. We don't buy or filter reviews.</li>
    <li><strong>Plain fees.</strong> 5% from mechanics per job. Every fee is written down on the <a href="/pricing">pricing page</a> and in our agreements.</li>
  </ul>
  <h2>Where we are</h2>
  <p>We're launching in the Denver area and adding cities as mechanics join. If you'd like WrenchNow where you live, email us your ZIP code.</p>
  <h2>Contact</h2>
  <p>WrenchNow, Denver, Colorado<br>Email: <a href="mailto:hello@getwrenchnow.com">hello@getwrenchnow.com</a></p>
  <p>Our <a href="/terms">Terms of Service</a>, <a href="/privacy">Privacy Policy</a> and <a href="/mechanic-agreement">Mechanic Agreement</a> are governed by the laws of the State of Colorado.</p>
</div></section>'''

def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj) + '</script>'
FAQ_LD = ld({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]})

pages = [
  ('index', '/index', 'Mobile Mechanic Near You | WrenchNow (Wrench Now): Car Repair at Home', 'Wrench Now is a mobile mechanic service. Background-checked mechanics come to your home or work for oil changes, brakes, batteries, diagnostics and more. Upfront quotes, pay after the job.', home, '', FAQ_LD),
  ('how-it-works', '/how-it-works', 'How it works · WrenchNow', 'How WrenchNow works for drivers and mechanics: request quotes, compare, book, approve price changes and pay after the job.', how, '/how-it-works'),
  ('mechanics', '/mechanics', 'For mechanics · WrenchNow', 'Join WrenchNow as a mobile mechanic. Set your own prices, 5% platform fee, free to join, paid to your bank through Stripe.', mech, '/mechanics'),
  ('pricing', '/pricing', 'Pricing · WrenchNow', 'What drivers and mechanics pay on WrenchNow: free quotes for drivers, a 5% platform fee for mechanics, and every other fee in full.', pricing, '/pricing'),
  ('fleet', '/fleet', 'Mobile Fleet Maintenance for Business Vehicles | WrenchNow', 'Mobile mechanics for work trucks, vans and company cars in the Denver area. On-site maintenance and repair at your lot, with upfront quotes and itemized receipts.', fleet, '/fleet'),
  ('about', '/about', 'About · WrenchNow', 'WrenchNow is a Denver company connecting drivers with independent mobile mechanics, with upfront quotes and payment through the app.', about, '/about'),
]
for fn, path, title, desc, body, active, *hd in pages:
    open(f'{OUT}/{fn}.html', 'w').write(page(path, title, desc, body, active, *hd))

# ── services hub + one page per service ──
os.makedirs(OUT + '/services')
def li(items): return '<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'
for x in SC.SERVICES:
    rel = ''.join(f'<li><a href="/services/{r}">{SC.BY_SLUG[r]["name"]}</a></li>' for r in x['related'])
    q = x['app'].replace(' ', '+').replace("'", '%27')
    body = f'''
<section class="page-head"><div class="wrap"><p class="small crumbs"><a href="/">Home</a> / <a href="/services/">Services</a></p><h1>{x['h1']}</h1><p class="lede">{x['lede']}</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px"><a class="btn btn-primary" href="/app/?service={q}">Get {x['name'].lower()} quotes</a><a class="btn btn-quiet" href="/how-it-works">How it works</a></div></div></section>
<section class="section"><div class="wrap prose">
  <h2 style="margin-top:0">Signs you need it</h2>{li(x['signs'])}
  <h2>What the mobile mechanic does on site</h2>{li(x['onsite'])}
  <p><strong>Good to know:</strong> {x['note']}</p>
  <h2>How booking works</h2>
  <p>Describe the job and your car, and background-checked mobile mechanics near you send upfront quotes with labor, parts and a time. Each quote shows an estimate of the dealer price next to it. Pick one, and the mechanic comes to your home or work. Your card is charged after the job, and any change in price needs your approval in the app first.</p>
  <h2>Related services</h2><ul>{rel}<li><a href="/services/">All mobile mechanic services</a></li></ul>
</div></section>
<section class="close-cta"><div class="wrap"><h2>{x['name']}, without the waiting room.</h2><div class="actions"><a class="btn btn-primary" href="/app/?service={q}">Get quotes</a></div></div></section>'''
    head = ld([{"@context": "https://schema.org", "@type": "Service", "name": x['name'], "serviceType": x['name'], "description": x['desc'], "areaServed": "US",
                "provider": {"@type": "Organization", "name": "WrenchNow", "url": SITE + "/"}, "url": f"{SITE}/services/{x['slug']}"},
               {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                 {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                 {"@type": "ListItem", "position": 2, "name": "Services", "item": SITE + "/services/"},
                 {"@type": "ListItem", "position": 3, "name": x['name'], "item": f"{SITE}/services/{x['slug']}"}]}])
    open(f"{OUT}/services/{x['slug']}.html", 'w').write(page(f"/services/{x['slug']}", x['title'], x['desc'], body, '/services/', head))

cards = ''.join(f'<li><a href="/services/{x["slug"]}"><b>{x["name"]}</b><span>{x["desc"].split(". ")[0]}.</span></a></li>' for x in SC.SERVICES)
hub = f'''
<section class="page-head"><div class="wrap"><h1>Mobile mechanic services</h1><p class="lede">Car maintenance and repair at your home, office or wherever your car is parked. Background-checked mobile mechanics near you send upfront quotes, and you pay after the job.</p></div></section>
<section class="section"><div class="wrap"><ul class="svc-list">{cards}</ul></div></section>
<section class="section"><div class="wrap svc-wrap"><div class="prose">
  <h2 style="margin-top:0">Why use a mobile mechanic?</h2>
  <p>A mobile mechanic brings the shop to you. There's no drive to a garage, no waiting room and no ride to arrange. Because independent mobile mechanics don't pay shop rent, their prices are often well below a dealer's, and every WrenchNow quote shows the dealer estimate beside it.</p>
  <p>Mobile auto repair covers most maintenance and many repairs. Jobs that need a lift or heavy equipment, like transmission rebuilds or wheel alignment, still need a shop, and your mechanic will tell you before quoting.</p>
</div>
<div class="unsure"><h3>Not sure what's wrong?</h3><p>Describe what you hear, see or smell. Mechanics quote a diagnosis visit, and some offer it free.</p><a class="btn btn-primary" href="/services/check-engine-light-diagnostic">Get a diagnosis</a></div></div></section>'''
open(f'{OUT}/services/index.html', 'w').write(page('/services/', 'Mobile Mechanic Services: Car Repair at Home or Work | WrenchNow',
  'Mobile mechanic services from WrenchNow: oil changes, brake repair, battery replacement, diagnostics, starters, alternators, inspections and more, at your home or work.', hub, '/services/'))


# ── legal pages from the app's own legal text ──
app = open(APP_SRC).read()
def legal(oid):
    i = app.index(f'id="{oid}"'); j = app.index('<div class="legal-body">', i) + len('<div class="legal-body">')
    depth, k = 1, j
    for m in re.finditer(r'<div\b|</div>', app[j:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0: k = j + m.start(); break
    title = re.search(r'<div class="legal-title">([^<]+)</div>', app[i:j]).group(1)
    upd = re.search(r'<div class="legal-updated">([^<]+)</div>', app[i:j]).group(1)
    body = re.sub(r'<span data-fee>\$49</span>', '$49', app[j:k])
    body = re.sub(r'<button[^>]*onclick="openLegal\(\'tosOverlay\'\)"[^>]*>([^<]+)</button>', r'<a href="/terms">\1</a>', body)
    body = re.sub(r'<button[^>]*onclick="openLegal\(\'privacyOverlay\'\)"[^>]*>([^<]+)</button>', r'<a href="/privacy">\1</a>', body)
    return title, upd, body
for oid, slug in [('tosOverlay', 'terms'), ('privacyOverlay', 'privacy'), ('mechAgreementOverlay', 'mechanic-agreement')]:
    t, upd, b = legal(oid)
    body = f'<section class="page-head"><div class="wrap"><h1>{t}</h1><p class="small">{upd}. WrenchNow, Denver, Colorado. Questions: <a href="mailto:hello@getwrenchnow.com">hello@getwrenchnow.com</a></p></div></section><section class="section"><div class="wrap prose">{b}</div></section>'
    descs = {'terms': 'The terms for using WrenchNow: quotes, payments through Stripe, price changes, refunds, disputes and Colorado governing law.',
             'privacy': 'What WrenchNow collects, why, who it is shared with (only the mechanic you book gets your address), and your choices.',
             'mechanic-agreement': 'The agreement for mechanics on WrenchNow: independent contractor terms, quotes, the 5% platform fee, onboarding fee and payouts.'}
    open(f'{OUT}/{slug}.html', 'w').write(page('/' + slug, f'{t} · WrenchNow', descs[slug], body))

# ── 404 ──
nf = '<section class="page-head" style="border:0;min-height:50vh"><div class="wrap"><h1>Wrong turn.</h1><p class="lede">That page doesn\'t exist. Here\'s the way back.</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px"><a class="btn btn-primary" href="/">Go to the home page</a><a class="btn btn-quiet" href="/app/">Open the app</a></div></div></section>'
html404 = page('/404', 'Page not found · WrenchNow', 'This page does not exist.', nf).replace('<link rel="canonical" href="https://getwrenchnow.com/404">', '<meta name="robots" content="noindex">')
open(f'{OUT}/404.html', 'w').write(html404)

# ── app, PWA files, SEO + Netlify config ──
shutil.copy(APP_SRC, f'{OUT}/app/index.html')
shutil.copytree(HERE + '/fonts', f'{OUT}/fonts')
for f in os.listdir(PWA): shutil.copy(f'{PWA}/{f}', OUT)
urls = ['/', '/services/'] + [f"/services/{x['slug']}" for x in SC.SERVICES] + ['/how-it-works', '/mechanics', '/pricing', '/fleet', '/about', '/terms', '/privacy', '/mechanic-agreement']
open(f'{OUT}/sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{datetime.date.today().isoformat()}</lastmod></url>\n' for u in urls) + '</urlset>\n')
open(f'{OUT}/robots.txt', 'w').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
open(f'{OUT}/_redirects', 'w').write(''.join(f'{u}  {u}.html  200\n' for u in urls[1:] if not u.endswith('/')) + '/app  /app/  301\n/services  /services/  301\n')
open(f'{OUT}/_headers', 'w').write('/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=2592000\n/*.png\n  Cache-Control: public, max-age=604800\n/sw.js\n  Cache-Control: no-cache\n')
print('built', OUT, sorted(os.listdir(OUT)))
