"""
Comprehensive end-to-end test — Phase 1 through Phase 4 + Phase 1 P2 quality items.
Tests: auth, sidebar, dashboard executive summary, dashboard action items,
       Phase 1 UX fixes (keyboard nav, kanban empty state, JobBoard empty states),
       job cards, detail panel, status updates, landing page, analytics,
       automation, Kanban, AI Insights, command palette, keyboard shortcuts,
       animated counters, sign out flow, search, filters, cover letter,
       Phase 1 P2: ARIA attrs, focus trap, skeleton loading, activity labels,
       activity truncation, activity feed empty state.

Run:  python3 tests/e2e.py
      BASE=https://staging.example.com python3 tests/e2e.py
"""

import sys, time, os
from playwright.sync_api import sync_playwright, expect

BASE     = os.environ.get('BASE', 'https://qa-job-tracker.vercel.app')
PASSWORD = '1C7vF3EZwbsPLeN'

results  = []
section  = ''

def sec(name):
    global section
    section = name
    print(f'\n{"═"*60}')
    print(f'  {name}')
    print(f'{"═"*60}')

def ok(label, detail=''):
    results.append(('PASS', section, label))
    print(f'  ✅ {label}' + (f'  →  {detail}' if detail else ''))

def fail(label, detail=''):
    results.append(('FAIL', section, label))
    print(f'  ❌ {label}' + (f'  →  {detail}' if detail else ''))

def warn(label, detail=''):
    results.append(('WARN', section, label))
    print(f'  ⚠️  {label}' + (f'  →  {detail}' if detail else ''))

def probe(label, detail=''):
    results.append(('PROBE', section, label))
    print(f'  🔍 {label}' + (f'  →  {detail}' if detail else ''))

def chk(cond, label, detail=''):
    (ok if cond else fail)(label, detail)

# ─────────────────────────────────────────────────────────────────────────────

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)

    def make_authed_page(width=1280, height=900):
        ctx = browser.new_context(viewport={'width': width, 'height': height})
        pg  = ctx.new_page()
        pg.goto(f'{BASE}/login', wait_until='networkidle')
        pg.fill('input[type="password"]', PASSWORD)
        pg.click('button[type="submit"]')
        pg.wait_for_url(lambda u: '/login' not in u, timeout=8000)
        return pg

    # ══════════════════════════════════════════════════════════════════════════
    # P1 — Auth, sidebar, dashboard executive summary
    # ══════════════════════════════════════════════════════════════════════════

    sec('P1 · Auth + Dark theme')
    import re as _re
    anon = browser.new_context(viewport={'width':1280,'height':900}).new_page()
    anon.goto(BASE, wait_until='networkidle')
    chk('/landing' in anon.url,             'Unauthenticated / → /landing',    anon.url)
    bg = anon.evaluate("getComputedStyle(document.body).backgroundColor")
    _m  = _re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', bg)
    _dark = bool(_m) and all(int(x) < 40 for x in _m.groups()) if _m else False
    chk(_dark,                              'Dark background on body',          bg)
    anon.context.close()

    page = make_authed_page()

    # ── Close any popup pages immediately (Apply buttons open links) ──────────
    page.context.on('page', lambda p: p.close())

    sec('P1 · Sidebar navigation')
    sidebar = page.locator('aside').first
    chk(sidebar.is_visible(),               'Sidebar visible on desktop')

    NAV = [
        ('Dashboard',     '/'),
        ('Pipeline',      '/pipeline'),
        ('Jobs',          '/jobs'),
        ('AI Insights',   '/insights'),
        ('Cover Letters', '/cover-letters'),
        ('Analytics',     '/analytics'),
        ('Automation',    '/automation'),
        ('Settings',      '/settings'),
        ('How It Works',  '/how-it-works'),
    ]
    for label, href in NAV:
        lnk = page.locator(f'a[href="{href}"]').first
        chk(lnk.count() > 0, f'Sidebar link: {label}', href)
    chk(page.get_by_text('Sign Out').count() > 0,       'Sign Out button in sidebar')
    chk(page.get_by_text('Command palette').count() > 0,'⌘K hint in sidebar')

    sec('P1 · Mobile sidebar drawer')
    mobile_ctx  = browser.new_context(viewport={'width': 390, 'height': 844})
    mobile_page = mobile_ctx.new_page()
    mobile_page.goto(f'{BASE}/login', wait_until='networkidle')
    mobile_page.fill('input[type="password"]', PASSWORD)
    mobile_page.click('button[type="submit"]')
    mobile_page.wait_for_url(lambda u: '/login' not in u, timeout=8000)
    hamburger = mobile_page.locator('div[class*="h-14"] button').first
    chk(hamburger.is_visible(),             'Hamburger button visible on mobile')
    hamburger.click()
    mobile_page.wait_for_timeout(400)
    drawer = mobile_page.locator('aside').nth(1)
    chk(drawer.count() > 0,                'Mobile drawer opens after hamburger click')
    mobile_page.keyboard.press('Escape')
    mobile_page.wait_for_timeout(300)
    mobile_ctx.close()

    # ── Dashboard executive summary ───────────────────────────────────────────

    sec('P1 · Dashboard — executive summary')
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(1500)  # allow Suspense / server component to settle

    h1 = page.locator('h1').first.text_content() or ''
    chk('Dashboard' in h1,                 'h1 = "Dashboard"', h1.strip())

    # Header badge
    chk(page.get_by_text('Live · AI-Powered').count() > 0,
        'Live · AI-Powered badge in header')

    # 4 KPI stat cards
    kpi_labels = ['Total Jobs', 'High Match', 'In Progress', 'Cover Letters']
    for lbl in kpi_labels:
        chk(page.get_by_text(lbl).count() > 0, f'KPI card: {lbl}')

    # KPI values are numbers (tabular-nums)
    kpi_nums = page.locator('.tabular-nums')
    chk(kpi_nums.count() >= 4,             '4 KPI numeric values visible',     f'{kpi_nums.count()} found')

    total_jobs_val = kpi_nums.first.text_content() or '0'
    chk(total_jobs_val.strip().isdigit(),  'Total Jobs is a number',           total_jobs_val)

    # KPI cards link to correct pages
    chk(page.locator('a[href="/jobs"]').count() >= 2,       'Total Jobs + High Match → /jobs')
    chk(page.locator('a[href="/pipeline"]').count() > 0,    'In Progress → /pipeline')
    chk(page.locator('a[href="/cover-letters"]').count() > 0,'Cover Letters → /cover-letters')

    # "Needs Attention" section
    chk(page.get_by_text('Needs Attention').count() > 0,    '"Needs Attention" section heading')
    chk(page.get_by_text('New · score ≥ 7 · awaiting action').count() > 0,
        '"Needs Attention" subtitle text')

    # View all → /jobs
    view_all = page.locator('a[href="/jobs"]').filter(has_text='View all')
    chk(view_all.count() > 0,              '"View all" link → /jobs')

    # Quick Nav cards
    for nav_label in ['Pipeline', 'Cover Letters', 'Analytics']:
        chk(page.locator('[class*="rounded-xl"]').filter(has_text=nav_label).count() > 0,
            f'Quick nav card: {nav_label}')

    # No job board / no SearchFilter on dashboard
    chk(page.locator('input[placeholder*="Search jobs"]').count() == 0,
        'Dashboard has NO SearchFilter (executive summary only)')
    chk(page.locator('button').filter(has_text='Filters').count() == 0,
        'Dashboard has NO Filters button')

    # Activity feed sidebar (xl-only at 1280px)
    chk(page.get_by_text('Recent Activity').count() > 0,   'Recent Activity sidebar heading')

    # ── Dashboard action item buttons ─────────────────────────────────────────

    sec('P1 · Dashboard — action item buttons')
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(1500)

    # Determine state: items present or "All caught up"
    all_caught_up = page.get_by_text('All caught up').count() > 0
    no_jobs_yet   = page.get_by_text('No jobs yet').count() > 0

    if no_jobs_yet:
        probe('No jobs in Airtable — skipping action item button tests')
    elif all_caught_up:
        probe('All caught up — no action items to test buttons on')
    else:
        # Should have at least one action item row
        # Rows are flex divs containing a score badge + title + button group
        action_rows = page.locator('section').filter(has_text='Needs Attention').locator(
            '[class*="bg-\\[\\#111118\\]"][class*="rounded-xl"]'
        )
        row_count = action_rows.count()
        chk(row_count > 0,                 'Action item rows present', f'{row_count} rows')

        if row_count > 0:
            first_row = action_rows.first
            row_text  = first_row.text_content() or ''

            # Score badge (number 5-10 in the row; no word-boundary between digit+letter e.g. "10QA")
            score_match = _re.search(r'(?<!\d)(10|[5-9])(?!\d)', row_text)
            chk(bool(score_match),         'Score badge value visible in first row', row_text[:60])

            # Skip (X) button always present
            skip_btn = first_row.locator('button').last  # X is always the last button
            chk(skip_btn.count() > 0,      'Skip (X) button present in action item')

            # Apply button (if job has apply link)
            apply_btn = first_row.locator('button').filter(has_text='Apply').first
            has_apply = apply_btn.count() > 0
            probe('Apply button in first action item', f'present={has_apply}')

            if has_apply:
                apply_btn.click()
                page.wait_for_timeout(800)
                # After clicking Apply: button should change to "Applied ✓"
                applied_badge = first_row.locator('span').filter(has_text='Applied').first
                chk(applied_badge.count() > 0 or
                    first_row.locator('button').filter(has_text='Apply').count() == 0,
                    'Apply click → button becomes "Applied ✓"')

            # Cover Letter button (data-dependent)
            cl_btn = first_row.locator('a').filter(has_text='Cover Letter').first
            probe('Cover Letter button in first row', f'present={cl_btn.count() > 0}')

            # Skip second row (different from first to avoid removing the "Applied" one)
            if row_count >= 2:
                second_row  = action_rows.nth(1)
                skip_second = second_row.locator('button').last
                title_before = second_row.text_content() or ''
                skip_second.click()
                page.wait_for_timeout(600)
                # Row should disappear (filter removes it from state)
                rows_after = page.locator('section').filter(has_text='Needs Attention').locator(
                    '[class*="bg-\\[\\#111118\\]"][class*="rounded-xl"]'
                ).count()
                chk(rows_after < row_count,
                    'Skip removes job row from action items list',
                    f'{row_count} → {rows_after}')
            else:
                # Only one row — skip it and verify "All caught up" or empty
                skip_btn.click()
                page.wait_for_timeout(600)
                caught_up = page.get_by_text('All caught up').count() > 0
                chk(caught_up,             'Skipping last item → "All caught up" state')

    # ── Phase 1 UX fixes ──────────────────────────────────────────────────────

    sec('Phase 1 · JobBoard empty states (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(1000)

    jobs_total = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').count()
    if jobs_total > 0:
        ok(f'Jobs page: normal list ({jobs_total} cards) — not showing empty state')

        # Filter to something that won't match → should show filter-level empty state
        search = page.locator('input[placeholder*="Search"]').first
        if search.count() > 0:
            search.fill('zzzzxxxxxnonexistent12345')
            page.wait_for_timeout(400)
            chk(page.get_by_text('No jobs match your filters').count() > 0,
                'Filter-empty: shows "No jobs match your filters"')
            chk(page.get_by_text('No jobs yet').count() == 0,
                'Filter-empty: does NOT show "No jobs yet"')
            chk(page.get_by_text('Clear all filters').count() > 0,
                'Filter-empty: shows "Clear all filters" button')
            probe('Filter-empty: no "Go to Automation" link',
                  f'automation link={page.locator("a[href=\"/automation\"]").count() > 0}')
            search.fill('')
            page.wait_for_timeout(200)
    else:
        # True empty state
        chk(page.get_by_text('No jobs yet').count() > 0,
            'True-empty: shows "No jobs yet"')
        chk(page.locator('a[href="/automation"]').count() > 0,
            'True-empty: shows "Go to Automation →" link')

    sec('Phase 1 · Kanban empty column state (/pipeline)')
    page.goto(f'{BASE}/pipeline', wait_until='networkidle')
    page.wait_for_timeout(1000)

    # Find any column that has 0 cards — look for the "Empty" text
    empty_label = page.get_by_text('Empty')
    chk(empty_label.count() > 0,          'Empty column shows "Empty" label',
        f'{empty_label.count()} empty column(s)')

    # Check dashed-border element exists in at least one column
    dashed = page.locator('[class*="border-dashed"]')
    chk(dashed.count() > 0,               'Empty column has dashed-border icon')

    # Probe: "Drop here" / invisible text NOT present
    drop_here = page.get_by_text('Drop here')
    probe('Old invisible "Drop here" text gone', f'found={drop_here.count() > 0}')
    chk(drop_here.count() == 0,           'Old invisible "Drop here" text is removed')

    sec('Phase 1 · Job card keyboard accessibility (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(800)

    # Cards should have tabIndex=0 and role=article
    first_card_tabindex = page.locator('[role="article"][tabindex="0"]').first
    chk(first_card_tabindex.count() > 0,  'Job cards have role="article" tabIndex=0')

    if first_card_tabindex.count() > 0:
        # Focus the first card directly (simulates keyboard focus — triggers :focus-within)
        first_card_tabindex.focus()
        page.wait_for_timeout(200)

        focused_role = page.evaluate("document.activeElement?.getAttribute('role')")
        chk(focused_role == 'article',     'Job card is keyboard-focusable (role=article receives focus)')

        if focused_role == 'article':
            # Action buttons should be visible via group-focus-within
            # They have opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
            apply_visible = page.evaluate("""
                (() => {
                    const card = document.activeElement;
                    if (!card) return false;
                    const btn = card.querySelector('button');
                    if (!btn) return false;
                    const style = getComputedStyle(btn);
                    return style.opacity !== '0';
                })()
            """)
            chk(apply_visible,             'Action buttons visible when card is keyboard-focused')

            # Enter opens detail panel
            page.keyboard.press('Enter')
            page.wait_for_timeout(500)
            panel = page.locator('[class*="backdrop-blur"]')
            chk(panel.count() > 0,         'Enter on focused card opens detail panel')
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)

    # ── Job cards & scoring on /jobs ──────────────────────────────────────────

    sec('P1 · Job cards & scoring (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(800)

    cards = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]')
    card_count = cards.count()
    chk(card_count > 0,                    'Job cards rendered on /jobs',       str(card_count))

    score_badges = page.locator('[class*="text-lg"][class*="font-bold"]')
    chk(score_badges.count() > 0,          'Score badges visible on cards',     f'{score_badges.count()} badges')

    emerald_borders = page.locator('[class*="border-l-emerald"]')
    elite_count = emerald_borders.count()
    if elite_count > 0:
        ok('Elite card emerald border present', f'{elite_count} card(s)')
    else:
        probe('No score 9-10 cards currently (depends on data)')

    sec('P1 · Job detail panel (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(800)

    cards = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]')
    if cards.count() > 0:
        cards.first.click()
        page.wait_for_timeout(600)
        panel = page.locator('[class*="backdrop-blur"]')
        chk(panel.count() > 0,             'Detail panel opens on card click')

        if panel.count() > 0:
            panel_title = page.locator('h2').first.text_content() or ''
            chk(len(panel_title) > 3,      'Panel shows job title',             panel_title[:50])

            score_in_panel = page.locator('[class*="text-2xl"][class*="font-bold"]').count()
            chk(score_in_panel > 0,        'Score badge in detail panel')

            status_btns = page.locator('button').filter(has_text='Applied').count() + \
                          page.locator('button').filter(has_text='New').count()
            chk(status_btns > 0,           'Status buttons in detail panel')

            chk(page.get_by_text('AI Assessment').count() > 0, 'AI Assessment section in panel')

            page.wait_for_timeout(800)
            ai_section = page.locator('section').filter(has_text='AI Assessment')
            if ai_section.count() > 0:
                reasoning = ai_section.locator('p').first
                text_val = reasoning.text_content() or ''
                probe('AI reasoning text visible', f'{len(text_val)} chars after 800ms')
    else:
        probe('No job cards to test panel with')

    sec('P1 · Status change + toast (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(800)
    page.keyboard.press('Escape')
    page.wait_for_timeout(200)

    first_card = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').first
    if first_card.count() > 0:
        first_card.click()
        page.wait_for_timeout(500)
        status_btn = page.locator('button[class*="rounded-lg"]').filter(has_text='Applied').first
        if status_btn.count() == 0:
            status_btn = page.locator('button[class*="rounded-lg"]').filter(has_text='New').first
        if status_btn.count() > 0:
            status_btn.click()
            page.wait_for_timeout(800)
            toast = page.locator('[data-sonner-toast]')
            chk(toast.count() > 0,         'Toast notification on status change')
        else:
            probe('Status buttons not found — may already match')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('No job cards to test status change with')

    # ══════════════════════════════════════════════════════════════════════════
    # P2 — Landing, Analytics, Automation
    # ══════════════════════════════════════════════════════════════════════════

    sec('P2 · Landing page (public, no auth)')
    anon2 = browser.new_context(viewport={'width':1280,'height':900}).new_page()
    anon2.goto(f'{BASE}/landing', wait_until='networkidle')
    chk(anon2.url.endswith('/landing'),    '/landing accessible without auth')

    hero_h1 = anon2.locator('h1').first.text_content() or ''
    chk('QA' in hero_h1,                  'Hero headline present',             hero_h1[:60])

    metrics_text = anon2.locator('body').text_content() or ''
    chk('200+' in metrics_text,           'Metrics row: 200+ Jobs Analyzed')
    chk('18' in metrics_text,             'Metrics row: 18 Searches/Day')

    feature_cards = anon2.locator('[class*="rounded-2xl"][class*="hover\\:border"]')
    chk(feature_cards.count() >= 6,       'Features grid: 6+ cards',           str(feature_cards.count()))

    hiw = anon2.locator('#how-it-works')
    chk(hiw.count() > 0,                  '#how-it-works anchor exists on landing page')
    chk(anon2.get_by_text('How the pipeline works').count() > 0,
        '"How the pipeline works" section visible')

    chk('Claude AI' in metrics_text,      'Tech stack: Claude AI listed')
    chk('n8n' in metrics_text,            'Tech stack: n8n listed')
    chk('Airtable' in metrics_text,       'Tech stack: Airtable listed')

    hiw_links = anon2.locator('a[href="#how-it-works"]')
    chk(hiw_links.count() > 0,           '"How It Works" header link is #anchor', f'{hiw_links.count()} found')

    view_dash = anon2.locator('a[href="/login"]')
    chk(view_dash.count() > 0,           '"View Dashboard" links go to /login', f'{view_dash.count()} found')

    chk(anon2.get_by_text('Dashboard').count() > 0, 'Footer: Dashboard link')
    chk(anon2.get_by_text('Analytics').count() > 0, 'Footer: Analytics link')

    hiw_links.first.click()
    anon2.wait_for_timeout(600)
    chk('/landing' in anon2.url,          'Clicking How It Works stays on /landing', anon2.url)
    anon2.context.close()

    sec('P2 · Analytics page')
    page.goto(f'{BASE}/analytics', wait_until='networkidle')
    h1 = page.locator('h1').first.text_content() or ''
    chk('Analytics' in h1,               'Analytics h1', h1.strip())

    for label in ['AVG AI SCORE','HIGH MATCH JOBS','APPLICATIONS SENT','INTERVIEW RATE']:
        chk(page.get_by_text(label).count() > 0, f'KPI card: {label}')

    svgs = page.locator('svg.recharts-surface')
    chk(svgs.count() >= 3,               'Recharts charts rendered',           f'{svgs.count()} SVG surfaces')

    for chart in ['Jobs Found Per Day','Score Distribution','Application Funnel','Source Performance']:
        chk(page.get_by_text(chart).count() > 0, f'Chart: {chart}')

    sec('P2 · Automation monitor page')
    page.goto(f'{BASE}/automation', wait_until='networkidle')
    h1 = page.locator('h1').first.text_content() or ''
    chk('Automation' in h1,              'Automation h1', h1.strip())

    for lbl in ['LAST RUN','JOBS FETCHED','AFTER FILTER','SCORED','COVER LETTERS','DURATION']:
        chk(page.get_by_text(lbl).count() > 0, f'Status card: {lbl}')

    for step in ['Job Search','Deduplication','Location Filter',
                 'Claude Haiku Scoring','Cover Letter Gen','Airtable Storage','Slack Digest']:
        chk(page.get_by_text(step).count() > 0, f'Pipeline step: {step}')

    chk(page.get_by_text('AI Cost Tracker').count() > 0,      'AI Cost Tracker card')
    chk(page.get_by_text('Next Scheduled Run').count() > 0,   'Next Scheduled Run card')
    chk(page.get_by_text('0 8 * * *').count() > 0,            'Cron expression visible')
    chk(page.get_by_text('Recent Workflow Runs').count() > 0, 'Recent Workflow Runs table')

    rows = page.locator('tbody tr')
    chk(rows.count() == 7,               'Run history: 7 rows',               f'{rows.count()} rows')

    run_btn = page.get_by_role('button', name='Run Workflow Now')
    chk(run_btn.count() > 0,            '"Run Workflow Now" button present')
    run_btn.click()
    page.wait_for_timeout(600)
    toast = page.locator('[data-sonner-toast]')
    chk(toast.count() > 0,             'Toast fires on "Run Workflow Now" click')

    sec('P2 · How It Works page (dashboard)')
    page.goto(f'{BASE}/how-it-works', wait_until='networkidle')
    h1 = page.locator('h1').first.text_content() or ''
    chk(len(h1) > 3,                    'How It Works page loads (auth required)', h1[:40])

    # ══════════════════════════════════════════════════════════════════════════
    # P3 — Kanban, AI Insights, palette, counters, shortcuts
    # ══════════════════════════════════════════════════════════════════════════

    sec('P3 · Kanban board (/pipeline)')
    page.goto(f'{BASE}/pipeline', wait_until='networkidle')
    h1 = page.locator('h1').first.text_content() or ''
    chk('Pipeline' in h1,               'Pipeline page loads', h1.strip())

    for status in ['New', 'Applied', 'Interviewing', 'Offer', 'Rejected']:
        found = page.get_by_text(status.upper()).count() > 0 or \
                page.get_by_text(status).count() > 0
        chk(found,                       f'Column: {status}')

    drags = page.locator('[class*="touch-none"]')
    drag_count = drags.count()
    chk(drag_count > 0,                 'Draggable job cards present',         f'{drag_count}')

    score_badges_k = page.locator('[class*="w-9"][class*="h-9"][class*="rounded-lg"]')
    chk(score_badges_k.count() > 0,    'Score badges on Kanban cards',        f'{score_badges_k.count()}')

    if drag_count > 0:
        first_drag = drags.first
        box = first_drag.bounding_box()
        if box:
            cols = page.locator('[class*="uppercase"][class*="tracking-widest"]')
            target_box = cols.nth(1).bounding_box() if cols.count() > 1 else None
            if target_box:
                mx = box['x'] + box['width'] / 2
                my = box['y'] + box['height'] / 2
                tx = target_box['x'] + 120
                ty = target_box['y'] + 80
                page.mouse.move(mx, my)
                page.mouse.down()
                page.mouse.move(tx, ty, steps=15)
                page.mouse.up()
                page.wait_for_timeout(500)
                probe('Cross-column drag completed without page crash')

    page.goto(f'{BASE}/pipeline', wait_until='networkidle')
    fresh_drags = page.locator('[class*="touch-none"]')
    if fresh_drags.count() > 0:
        page.evaluate('''
            const el = document.querySelector('[class*="cursor-grab"]');
            if (el) el.click();
        ''')
        page.wait_for_timeout(600)
        panel_open = page.locator('[class*="backdrop-blur"]').count() > 0
        chk(panel_open,                 'Card click in Kanban opens detail panel')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)

    sec('P3 · AI Insights')
    page.goto(f'{BASE}/insights', wait_until='networkidle')
    h1 = page.locator('h1').first.text_content() or ''
    chk('Insight' in h1,                'AI Insights page loads', h1.strip())

    chk(page.get_by_text('AI-Generated').count() > 0,   'AI-Generated badge in header')
    chk(page.get_by_text('AI Weekly Summary').count() > 0, 'AI Weekly Summary panel')

    for s in ['Playwright','Selenium','CI/CD','TypeScript']:
        chk(page.get_by_text(s).count() > 0, f'Skill tag: {s}')

    chk(page.locator('[class*="bg-emerald-400"]').count() > 0,
        'Green dot indicators (in-resume skills)')
    chk(page.get_by_text('Market Trends').count() > 0,  'Market Trends section')

    for priority in ['High', 'Medium', 'Low']:
        chk(page.get_by_text(priority).count() > 0, f'Recommendation priority: {priority}')

    chk(page.get_by_text('Resume Gap Analysis').count() > 0, 'Resume Gap Analysis section')
    chk(page.get_by_text('AWS').count() > 0,                 'AWS gap item visible')
    chk(page.get_by_text('Top Matching Companies').count() > 0, 'Top Matching Companies section')

    sec('P3 · Animated stat counters (/jobs StatsBar)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(500)

    # StatsBar has 6 counters: Total, New, Applied, Interviewing, Offer, Rejected
    stats = page.locator('.tabular-nums')
    chk(stats.count() >= 6,             'StatsBar: 6 counters on /jobs',        f'{stats.count()} found')

    total_val = 0
    try:
        total_val = int(stats.first.text_content() or '0')
    except ValueError:
        pass
    chk(total_val > 0,                  'Total jobs counter > 0 (live data)',   str(total_val))

    # Sample counter values to detect animation
    samples = []
    for _ in range(6):
        page.wait_for_timeout(80)
        val = stats.first.text_content() or '0'
        try:
            samples.append(int(val))
        except ValueError:
            samples.append(0)
    final_val = samples[-1]
    chk(final_val > 0,                  'Counter reaches final value',          str(final_val))
    probe('Animation sampling', f'samples={samples} final={final_val}')

    sec('P3 · Cmd+K command palette')
    page.goto(BASE, wait_until='networkidle')

    chk(page.get_by_text('Command palette').count() > 0, 'Sidebar ⌘K hint visible')

    page.keyboard.press('Meta+k')
    page.wait_for_timeout(400)
    inp = page.locator('input[placeholder*="Search pages"]').or_(page.locator('input[cmdk-input]'))
    chk(inp.count() > 0,               'Cmd+K opens palette')

    if inp.count() > 0:
        chk(page.get_by_text('Navigate').count() > 0, 'Navigate group heading')
        chk(page.get_by_text('Account').count() > 0,  'Account group heading')

        for nav in ['Dashboard','Pipeline','Jobs','AI Insights','Analytics','Automation']:
            chk(page.get_by_text(nav).count() > 0, f'Palette item: {nav}')

        chk(page.get_by_text('G D').count() > 0 or
            page.locator('kbd:has-text("G")').count() > 0, 'Shortcut hints visible in palette')

        inp.type('anal')
        page.wait_for_timeout(200)
        chk(page.get_by_text('Analytics').count() > 0, 'Palette filters: "anal" → Analytics visible')

        inp.fill('')
        page.wait_for_timeout(150)
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        chk(inp.count() == 0,          'Escape closes palette')

    page.keyboard.press('Control+k')
    page.wait_for_timeout(400)
    inp2 = page.locator('input[placeholder*="Search pages"]').or_(page.locator('input[cmdk-input]'))
    chk(inp2.count() > 0,             'Ctrl+K also opens palette')
    page.keyboard.press('Escape')

    sec('P3 · Keyboard shortcuts — j/k navigation (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(700)

    page.keyboard.press('j')
    page.wait_for_timeout(200)
    ring1 = page.locator('[class*="ring-indigo"]').count()
    chk(ring1 > 0,                    'j key → focus ring appears on first card')

    page.keyboard.press('j')
    page.wait_for_timeout(150)
    ring2 = page.locator('[class*="ring-indigo"]').count()
    chk(ring2 > 0,                    'j again → focus ring on 2nd card')

    page.keyboard.press('k')
    page.wait_for_timeout(150)
    probe('k key → focus moves back up')

    page.keyboard.press('Enter')
    page.wait_for_timeout(500)
    panel = page.locator('[class*="backdrop-blur"]')
    chk(panel.count() > 0,            'Enter → job detail panel opens')

    if panel.count() > 0:
        page.wait_for_timeout(300)
        ai_section = page.locator('section').filter(has_text='AI Assessment')
        ai_text = ai_section.locator('p').first.text_content() if ai_section.count() > 0 else ''
        probe('AI reasoning after 300ms', f'{len(ai_text or "")} chars visible')

    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    chk(page.locator('[class*="backdrop-blur"]').count() == 0, 'Escape closes detail panel')

    for _ in range(5):
        page.keyboard.press('j')
    for _ in range(3):
        page.keyboard.press('k')
    page.wait_for_timeout(200)
    probe('Rapid j/k (5 down, 3 up) — no crash')

    sec('P3 · G+chord navigation')
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(400)

    chords = [
        ('g','p', '/pipeline',  'G+P → Pipeline'),
        ('g','a', '/analytics', 'G+A → Analytics'),
        ('g','i', '/insights',  'G+I → AI Insights'),
        ('g','d', BASE+'/',     'G+D → Dashboard'),
    ]
    for k1, k2, expected, label in chords:
        page.keyboard.press(k1)
        page.keyboard.press(k2)
        try:
            page.wait_for_url(f'**{expected}**' if expected.startswith('/') else expected, timeout=4000)
            chk(True, label, page.url)
        except Exception:
            chk(False, label, page.url)

    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(400)
    current = page.url
    page.keyboard.press('g')
    page.keyboard.press('z')
    page.wait_for_timeout(300)
    probe('g+z (unmapped chord) — stays on current page', f'{page.url == current}')

    sec('P3 · Sign out flow')
    page.goto(BASE, wait_until='networkidle')
    sign_out = page.get_by_text('Sign Out').first
    chk(sign_out.is_visible(),           'Sign Out button visible in sidebar')
    sign_out.click()
    try:
        page.wait_for_url('**/landing**', timeout=6000)
        chk(True,                        'Sign Out → redirects to /landing', page.url)
    except Exception:
        chk(False,                       'Sign Out redirect failed', page.url)

    page.goto(BASE, wait_until='networkidle')
    chk('/landing' in page.url,         'After sign-out, / redirects to /landing', page.url)

    page.goto(f'{BASE}/login', wait_until='networkidle')
    page.fill('input[type="password"]', PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_url(lambda u: '/login' not in u, timeout=8000)
    page.context.on('page', lambda p: p.close())  # re-register after new context

    sec('P3 · Fade-in page transitions')
    for route, name in [('/', 'Dashboard'), ('/pipeline', 'Pipeline'), ('/insights', 'Insights')]:
        page.goto(f'{BASE}{route}', wait_until='networkidle')
        fade = page.locator('[class*="animate-fade-in"]').count()
        chk(fade > 0,                   f'animate-fade-in on {name} wrapper', f'{fade} el(s)')

    # ══════════════════════════════════════════════════════════════════════════
    # P4 — Search, filters, apply actions, cover letter, activity
    # ══════════════════════════════════════════════════════════════════════════

    sec('P4 · Search bar (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')

    search_input = page.locator('input[placeholder*="Search"]').first
    chk(search_input.count() > 0,      'Search bar present on /jobs')

    if search_input.count() > 0:
        search_input.type('QA')
        page.wait_for_timeout(300)
        result_count = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').count()
        probe('Search "QA" results', f'{result_count} cards')

        search_input.fill('zzzzxxxxxnonexistent12345')
        page.wait_for_timeout(300)
        empty = page.get_by_text('No jobs match').count() > 0 or \
                page.locator('[class*="py-24"]').count() > 0
        chk(empty,                     'Empty state shown when search has no results')

        search_input.fill('')
        page.wait_for_timeout(200)

    sec('P4 · Advanced filters panel')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')

    filters_btn = page.locator('button').filter(has_text='Filters').first
    chk(filters_btn.count() > 0,       'Filters button present on /jobs')
    filters_btn.click()
    page.wait_for_timeout(300)

    for section_name in ['Status', 'Min score', 'Work type', 'Posted']:
        chk(page.get_by_text(section_name).count() > 0, f'Advanced panel: {section_name}')

    applied_chip = page.locator('button').filter(has_text='Applied').first
    if applied_chip.count() > 0:
        applied_chip.click()
        page.wait_for_timeout(200)
        filter_chip = page.locator('span[class*="bg-indigo-500/10"][class*="rounded-full"]')
        chk(filter_chip.count() > 0,  'Active filter chip appears after selecting status')

    clear_btn = page.locator('button').filter(has_text='Clear all').first
    if clear_btn.count() > 0:
        clear_btn.click()
        page.wait_for_timeout(400)
        chk(page.locator('button').filter(has_text='Clear all').count() == 0,
            'Clear all removes filter chips')

    filters_btn.click()
    page.wait_for_timeout(200)

    sec('P4 · Filter presets')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')

    presets_btn = page.locator('button').filter(has_text='Presets').first
    chk(presets_btn.count() > 0,       'Presets button present')
    presets_btn.click()
    page.wait_for_timeout(300)

    for preset in ['Remote Roles','High Match','Has Cover Letter','Needs Review']:
        chk(page.get_by_text(preset).count() > 0, f'Built-in preset: {preset}')

    page.get_by_text('High Match').first.click()
    page.wait_for_timeout(300)
    preset_chip = page.locator('span[class*="bg-indigo-500/10"][class*="rounded-full"]')
    chk(preset_chip.count() > 0,       'Applying preset creates active filter chip')

    clear_all = page.get_by_text('Clear all').first
    if clear_all.count() > 0:
        clear_all.click()
        page.wait_for_timeout(200)

    sec('P4 · Jobs page (/jobs)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    h1 = page.locator('h1').first.text_content() or ''
    chk('Jobs' in h1,                  'Jobs page h1', h1.strip())
    chk(page.locator('input[placeholder*="Search"]').count() > 0, 'Search bar on /jobs')
    chk(page.locator('button').filter(has_text='Filters').count() > 0, 'Filters button on /jobs')
    chk(page.locator('button').filter(has_text='Presets').count() > 0, 'Presets button on /jobs')
    cards_on_jobs = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').count()
    chk(cards_on_jobs > 0,            'Job cards on /jobs', f'{cards_on_jobs} cards')

    sec('P4 · Detail panel — apply actions')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    first_card = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').first
    if first_card.count() > 0:
        first_card.click()
        page.wait_for_timeout(500)

        panel = page.locator('[class*="backdrop-blur"]')
        chk(panel.count() > 0,         'Detail panel opens')

        if panel.count() > 0:
            open_btn = page.locator('button').filter(has_text='Open Job Posting').first
            chk(open_btn.count() > 0,  '"Open Job Posting" button in panel')

            skip_btn = page.locator('button').filter(has_text='Skip').first
            chk(skip_btn.count() > 0,  '"Skip" button in panel')

            chk(page.locator('button').filter(has_text='Interviewing').count() > 0,
                'Status pills in panel')

            activity_section = page.locator('button').filter(has_text='Activity').first
            chk(activity_section.count() > 0, 'Activity toggle in detail panel')
            if activity_section.count() > 0:
                activity_section.click()
                page.wait_for_timeout(200)
                probe('Activity panel expanded')

            cl_btn = page.locator('button').filter(has_text='View Cover Letter').first
            probe('Cover letter button (data-dependent)', f'found={cl_btn.count() > 0}')

    page.keyboard.press('Escape')
    page.wait_for_timeout(300)

    sec('P4 · Cover letter modal')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    cards = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]')
    found_cl = False
    for i in range(min(cards.count(), 8)):
        card = cards.nth(i)
        card.click()
        page.wait_for_timeout(400)
        cl_view = page.locator('button').filter(has_text='View Cover Letter').first
        if cl_view.count() > 0:
            cl_view.click()
            page.wait_for_timeout(800)
            # Toolbar has Edit/Copy/Download buttons + "Open Original" <a> link
            modal_open = page.locator('button').filter(has_text='Edit').count() > 0 or \
                         page.locator('button').filter(has_text='Copy').count() > 0 or \
                         page.get_by_text('Open Original').count() > 0
            chk(modal_open,            'Cover letter modal opens with Edit/Copy/Open Original')
            found_cl = True
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
            break
        page.keyboard.press('Escape')
        page.wait_for_timeout(200)

    else:
        probe('No jobs with cover_letter_url in current data — modal not tested')

    sec('P4 · Job card hover quick actions')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    cards = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]')
    if cards.count() > 0:
        cards.first.hover()
        page.wait_for_timeout(300)
        chk(page.locator('button').filter(has_text='Apply').count() > 0,
            'Apply quick action visible on card hover')
        chk(page.locator('button').filter(has_text='Skip').count() > 0,
            'Skip quick action visible on card hover')

    sec('P4 · Kanban quick actions')
    page.goto(f'{BASE}/pipeline', wait_until='networkidle')
    drags = page.locator('[class*="touch-none"]')
    if drags.count() > 0:
        drags.first.hover()
        page.wait_for_timeout(300)
        kanban_apply = page.locator('button').filter(has_text='Apply').count()
        kanban_btns  = page.locator('button[class*="rounded-md"]').count()
        chk(kanban_apply > 0 or kanban_btns > 0, 'Quick action buttons visible on Kanban card hover')

    sec('P4 · Activity feed on dashboard')
    page.goto(BASE, wait_until='networkidle')
    chk(page.get_by_text('Recent Activity').count() > 0, 'Recent Activity on dashboard')

    activity_text = page.get_by_text('just now').count() > 0 or \
                    page.get_by_text('ago').count() > 0 or \
                    page.get_by_text('Opened').count() > 0 or \
                    page.get_by_text('Skipped').count() > 0
    probe('Activity feed has entries', f'time-relative text visible={activity_text}')

    sec('P4 · Score range filter (7+)')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    filters_btn = page.locator('button').filter(has_text='Filters').first
    filters_btn.click()
    page.wait_for_timeout(300)

    score_7 = page.locator('button').filter(has_text='7+').first
    if score_7.count() > 0:
        score_7.click()
        page.wait_for_timeout(300)
        chip = page.locator('span[class*="bg-indigo-500/10"][class*="rounded-full"]').filter(has_text='Score')
        chk(chip.count() > 0,          'Score ≥ 7 chip appears')
        visible_cards = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').count()
        probe(f'Cards after Score ≥ 7 filter', f'{visible_cards} cards')
        clear_all = page.get_by_text('Clear all').first
        if clear_all.count() > 0:
            clear_all.click()
            page.wait_for_timeout(200)

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 1 P2 · Ax-2/3  ARIA + Focus trap — JobDetailPanel
    # ─────────────────────────────────────────────────────────────────────────
    sec('Phase 1 P2 · ARIA — JobDetailPanel')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(500)
    first_card = page.locator('[role="article"]').first
    if first_card.count() > 0:
        first_card.click()
        page.wait_for_timeout(400)
        panel = page.locator('[role="dialog"]').first
        chk(panel.count() > 0,                                      'Panel has role="dialog"')
        chk(panel.get_attribute('aria-modal') == 'true',            'Panel has aria-modal="true"')
        lb = panel.get_attribute('aria-labelledby')
        chk(lb is not None and lb != '',                            'Panel has aria-labelledby')
        if lb:
            title_el = page.locator(f'#{lb}')
            chk(title_el.count() > 0,                               f'#{lb} element exists')
        close_btn = panel.locator('button[aria-label*="Close"]').first
        chk(close_btn.count() > 0,                                  'Close button has aria-label')
        close_btn.click()
        page.wait_for_timeout(300)
    else:
        warn('ARIA — JobDetailPanel', 'No job cards found; skipping panel ARIA checks')

    sec('Phase 1 P2 · Focus trap — JobDetailPanel')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(500)
    first_card = page.locator('[role="article"]').first
    if first_card.count() > 0:
        first_card.focus()
        first_card.click()
        page.wait_for_timeout(400)
        panel = page.locator('[role="dialog"]').first
        if panel.count() > 0:
            # Initial focus lands inside dialog
            focused_in = page.evaluate(
                "() => document.querySelector('[role=\"dialog\"]')?.contains(document.activeElement)"
            )
            chk(focused_in, 'Initial focus is inside dialog')

            # Tab stays inside
            page.keyboard.press('Tab')
            page.wait_for_timeout(100)
            still_in = page.evaluate(
                "() => document.querySelector('[role=\"dialog\"]')?.contains(document.activeElement)"
            )
            chk(still_in, 'After Tab, focus stays inside dialog')

            # Shift+Tab stays inside
            page.keyboard.press('Shift+Tab')
            page.wait_for_timeout(100)
            still_in2 = page.evaluate(
                "() => document.querySelector('[role=\"dialog\"]')?.contains(document.activeElement)"
            )
            chk(still_in2, 'After Shift+Tab, focus stays inside dialog')

            # Escape closes panel and returns focus to card
            page.keyboard.press('Escape')
            page.wait_for_timeout(400)
            panel_gone = page.locator('[role="dialog"]').count() == 0
            chk(panel_gone, 'Escape closes panel')
            focused_tag = page.evaluate("() => document.activeElement?.getAttribute('role')")
            chk(focused_tag == 'article', 'Focus returns to triggering card after close')
        else:
            warn('Focus trap — JobDetailPanel', 'Panel did not open')
    else:
        warn('Focus trap — JobDetailPanel', 'No job cards found')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 1 P2 · Ax-2/3  ARIA + Focus trap — CoverLetterModal
    # ─────────────────────────────────────────────────────────────────────────
    sec('Phase 1 P2 · ARIA + Focus trap — CoverLetterModal')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(500)

    # Find a card that has a cover letter
    cl_card = None
    cards = page.locator('[role="article"]').all()
    for card in cards[:10]:
        card.hover()
        page.wait_for_timeout(150)
        if card.locator('a[href*="cover"]').count() > 0 or \
           card.locator('button').filter(has_text='CL').count() > 0 or \
           card.locator('[aria-label*="cover"]').count() > 0:
            cl_card = card
            break

    if cl_card is None and len(cards) > 0:
        # Open first card and look for cover letter button in panel
        cards[0].click()
        page.wait_for_timeout(400)
        panel = page.locator('[role="dialog"]').first
        if panel.count() > 0:
            cl_btn = panel.locator('a, button').filter(has_text='Cover Letter').first
            if cl_btn.count() == 0:
                cl_btn = panel.locator('a, button').filter(has_text='CL').first
            if cl_btn.count() > 0:
                cl_btn.click()
                page.wait_for_timeout(400)
                # Should now have 2 dialogs — outer panel + CL modal
                dialogs = page.locator('[role="dialog"]')
                chk(dialogs.count() >= 2, 'Both panel and CL modal open (2 dialogs)')

                cl_modal = dialogs.last
                chk(cl_modal.get_attribute('aria-modal') == 'true',    'CL modal has aria-modal="true"')
                lb2 = cl_modal.get_attribute('aria-labelledby')
                chk(lb2 is not None and lb2 != '',                     'CL modal has aria-labelledby')

                # Focus is inside CL modal
                cl_focused = page.evaluate(
                    """() => {
                        const dialogs = document.querySelectorAll('[role="dialog"]');
                        const modal = dialogs[dialogs.length - 1];
                        return modal?.contains(document.activeElement);
                    }"""
                )
                chk(cl_focused, 'Focus is inside CL modal')

                # Tab stays inside CL modal
                page.keyboard.press('Tab')
                page.wait_for_timeout(100)
                cl_tab_in = page.evaluate(
                    """() => {
                        const dialogs = document.querySelectorAll('[role="dialog"]');
                        const modal = dialogs[dialogs.length - 1];
                        return modal?.contains(document.activeElement);
                    }"""
                )
                chk(cl_tab_in, 'After Tab, focus stays in CL modal')

                # Escape closes only CL modal, panel remains
                page.keyboard.press('Escape')
                page.wait_for_timeout(400)
                remaining_dialogs = page.locator('[role="dialog"]').count()
                chk(remaining_dialogs == 1, 'Escape closes CL modal only (panel stays open)')

                # Second Escape closes panel
                page.keyboard.press('Escape')
                page.wait_for_timeout(400)
                all_gone = page.locator('[role="dialog"]').count() == 0
                chk(all_gone, 'Second Escape closes panel')
            else:
                probe('CL modal ARIA + focus trap', 'No cover letter button found in panel; skipping CL modal tests')
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)
        else:
            warn('CL modal ARIA + focus trap', 'Panel did not open')
    else:
        probe('CL modal ARIA + focus trap', 'No cover-letter card detected in first 10; skipping')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 1 P2 · L-2/L-3/L-4  Skeleton loading
    # ─────────────────────────────────────────────────────────────────────────
    import urllib.request, urllib.error

    def fetch_html_authed(path: str) -> str:
        """Fetch page HTML using the session cookie so auth passes."""
        url = f'{BASE}{path}'
        req = urllib.request.Request(url, headers={'Cookie': f'qa_tracker_auth=1'})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.read().decode('utf-8', errors='replace')
        except urllib.error.HTTPError as e:
            return ''

    sec('Phase 1 P2 · Skeleton — Pipeline')
    # Verify the SSR HTML contains skeleton markup (present in the initial streamed chunk)
    html = fetch_html_authed('/pipeline')
    has_skeleton = 'skeleton' in html.lower() or 'animate-pulse' in html or 'shimmer' in html.lower()
    probe('Pipeline initial HTML contains skeleton markup', f'found={has_skeleton}')

    page.goto(f'{BASE}/pipeline', wait_until='networkidle')
    page.wait_for_timeout(500)
    # After full load, Kanban column headings should be present (New, Applied, etc.)
    col_headings = page.get_by_text('New').count() + page.get_by_text('Applied').count() + \
                   page.get_by_text('Interviewing').count()
    chk(col_headings > 0, 'Pipeline loads Kanban columns after skeleton resolves')

    sec('Phase 1 P2 · Skeleton — Analytics')
    html2 = fetch_html_authed('/analytics')
    has_skeleton2 = 'skeleton' in html2.lower() or 'animate-pulse' in html2 or 'shimmer' in html2.lower()
    probe('Analytics initial HTML contains skeleton markup', f'found={has_skeleton2}')

    page.goto(f'{BASE}/analytics', wait_until='networkidle')
    page.wait_for_timeout(500)
    # KPI cards should be visible
    kpi = page.get_by_text('Avg Score').count() + page.get_by_text('High Match').count() + \
          page.get_by_text('Applied').count()
    chk(kpi > 0, 'Analytics loads KPI content after skeleton resolves')

    sec('Phase 1 P2 · Skeleton — AI Insights')
    html3 = fetch_html_authed('/insights')
    has_skeleton3 = 'skeleton' in html3.lower() or 'animate-pulse' in html3 or 'shimmer' in html3.lower()
    probe('Insights initial HTML contains skeleton markup', f'found={has_skeleton3}')

    page.goto(f'{BASE}/insights', wait_until='networkidle')
    page.wait_for_timeout(500)
    # AI-Generated badge or section headings should be present
    ai_content = page.get_by_text('AI-Generated').count() + \
                 page.get_by_text('Skill Demand').count() + \
                 page.get_by_text('Recommendations').count()
    chk(ai_content > 0, 'AI Insights loads content after skeleton resolves')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 1 P2 · A-1  Activity label format
    # ─────────────────────────────────────────────────────────────────────────
    sec('Phase 1 P2 · Activity label format')
    page.goto(f'{BASE}/', wait_until='networkidle')
    page.wait_for_timeout(400)

    # Inject synthetic activity entries directly into localStorage
    page.evaluate("""() => {
        const entries = [
            { id: 'test-1', type: 'applied',             jobId: 'j1', jobTitle: 'QA Engineer',     employer: 'Google Inc',   ts: Date.now() - 1000 },
            { id: 'test-2', type: 'skipped',             jobId: 'j2', jobTitle: 'SDET',             employer: 'Amazon',       ts: Date.now() - 2000 },
            { id: 'test-3', type: 'posting_opened',      jobId: 'j3', jobTitle: 'Test Automation',  employer: 'Meta',         ts: Date.now() - 3000 },
            { id: 'test-4', type: 'cover_letter_viewed', jobId: 'j4', jobTitle: 'QA Lead',          employer: 'Shopify',      ts: Date.now() - 4000 },
            { id: 'test-5', type: 'cover_letter_copied', jobId: 'j5', jobTitle: 'Senior QA',        employer: 'Stripe',       ts: Date.now() - 5000 },
            { id: 'test-6', type: 'status_change',       jobId: 'j6', jobTitle: 'QA Analyst',       employer: 'Netflix',      ts: Date.now() - 6000, detail: 'Interviewing' },
        ];
        localStorage.setItem('qa_tracker_activity', JSON.stringify(entries));
        window.dispatchEvent(new Event('qa_activity'));
    }""")
    page.wait_for_timeout(400)

    chk(page.get_by_text('Applied · Google Inc').count() > 0,      'applied → "Applied · [Employer]"')
    chk(page.get_by_text('Skipped · Amazon').count() > 0,          'skipped → "Skipped · [Employer]"')
    chk(page.get_by_text('Opened · Test Automation').count() > 0,  'posting_opened → "Opened · [JobTitle]"')
    chk(page.get_by_text('Viewed CL · Shopify').count() > 0,       'cover_letter_viewed → "Viewed CL · [Employer]"')
    chk(page.get_by_text('Copied CL · Stripe').count() > 0,        'cover_letter_copied → "Copied CL · [Employer]"')
    chk(page.get_by_text('Interviewing · Netflix').count() > 0,    'status_change → "[Status] · [Employer]"')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 1 P2 · A-2  Activity truncation — action verb survives long names
    # ─────────────────────────────────────────────────────────────────────────
    sec('Phase 1 P2 · Activity truncation')
    page.evaluate("""() => {
        const entries = [
            { id: 'trunc-1', type: 'applied', jobId: 'j7',
              jobTitle: 'QA Engineer',
              employer: 'Very Long Employer Name That Would Definitely Get Truncated At Narrow Widths',
              ts: Date.now() - 500 },
        ];
        localStorage.setItem('qa_tracker_activity', JSON.stringify(entries));
        window.dispatchEvent(new Event('qa_activity'));
    }""")
    page.wait_for_timeout(400)

    # The full text node should start with "Applied ·" even if the visual render truncates
    row_text = page.evaluate("""() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const match = spans.find(s => s.textContent?.startsWith('Applied ·'));
        return match ? match.textContent : null;
    }""")
    chk(row_text is not None and row_text.startswith('Applied ·'), 'Action verb "Applied ·" is at start of label text')
    probe('Full label DOM text', str(row_text)[:80] if row_text else 'not found')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 1 P2 · E-3  ActivityFeed empty state
    # ─────────────────────────────────────────────────────────────────────────
    sec('Phase 1 P2 · ActivityFeed empty state')

    # Clear activity so the empty state renders
    page.evaluate("""() => {
        localStorage.removeItem('qa_tracker_activity');
        window.dispatchEvent(new Event('qa_activity'));
    }""")
    page.wait_for_timeout(400)

    chk(page.get_by_text('No activity yet').count() > 0,                    '"No activity yet" heading visible')
    chk(page.get_by_text('Actions you take will appear here').count() > 0, 'Helper text visible')

    # Add one entry — empty state should disappear
    page.evaluate("""() => {
        const entries = [{ id: 'empty-test', type: 'applied', jobId: 'j1',
                           jobTitle: 'QA', employer: 'Acme', ts: Date.now() }];
        localStorage.setItem('qa_tracker_activity', JSON.stringify(entries));
        window.dispatchEvent(new Event('qa_activity'));
    }""")
    page.wait_for_timeout(400)

    chk(page.get_by_text('No activity yet').count() == 0, 'Empty state disappears after activity added')
    chk(page.get_by_text('Applied · Acme').count() > 0,   'New entry appears in feed')

    # Restore clean state
    page.evaluate("() => localStorage.removeItem('qa_tracker_activity')")

    browser.close()

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print(f'\n{"═"*60}')
print('  FULL TEST SUMMARY')
print(f'{"═"*60}')

by_phase = {}
for status, sec_name, label in results:
    phase = sec_name.split('·')[0].strip()
    by_phase.setdefault(phase, {'PASS':0,'FAIL':0,'WARN':0,'PROBE':0})
    by_phase[phase][status] += 1

for phase, counts in sorted(by_phase.items()):
    p, f, w, pr = counts['PASS'], counts['FAIL'], counts['WARN'], counts['PROBE']
    bar = '✅' * min(p, 12) + '❌' * min(f, 5)
    print(f'  {phase:<12}  PASS={p:<3} FAIL={f:<3} PROBE={pr:<2}  {bar}')

total_pass  = sum(1 for r in results if r[0] == 'PASS')
total_fail  = sum(1 for r in results if r[0] == 'FAIL')
total_warn  = sum(1 for r in results if r[0] == 'WARN')
total_probe = sum(1 for r in results if r[0] == 'PROBE')

print(f'{"─"*60}')
print(f'  TOTAL   PASS={total_pass}  FAIL={total_fail}  WARN={total_warn}  PROBE={total_probe}')
verdict = 'PASS ✅' if total_fail == 0 else 'FAIL ❌'
print(f'  VERDICT: {verdict}')
print(f'{"═"*60}')

if total_fail > 0:
    print('\n  FAILURES:')
    for status, sec_name, label in results:
        if status == 'FAIL':
            print(f'    ❌ [{sec_name}] {label}')

sys.exit(0 if total_fail == 0 else 1)
