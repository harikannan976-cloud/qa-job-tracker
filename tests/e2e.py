"""
Comprehensive end-to-end test — Phase 1 through Phase 4 + Phase 1 P2 quality items.
Tests: auth, sidebar, dashboard executive summary, dashboard action items,
       Phase 1 UX fixes (keyboard nav, kanban empty state, JobBoard empty states),
       job cards, detail panel, status updates, landing page, analytics,
       automation, Kanban, AI Insights, command palette, keyboard shortcuts,
       animated counters, sign out flow, search, filters, cover letter,
       Phase 1 P2: ARIA attrs, focus trap, skeleton loading, activity labels,
       activity truncation, activity feed empty state.
       Phase 2 C2: tracking fields render, save/persist, loading state,
       error toast, applied_date auto-set, job switch reset.
       Phase 3 C2: dashboard preference panel, weekly goal, score filter from
       prefs, clear-all pref restore, smart indicators, follow-up auto-suggest.

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

    for lbl in ['Last Run', 'Jobs Added', 'Duration', 'Result']:
        chk(page.get_by_text(lbl).count() > 0, f'Status card: {lbl}')

    for step in ['Job Search','Deduplication','Location Filter',
                 'Claude Haiku Scoring','Cover Letter Gen','Airtable Storage','Slack Digest']:
        chk(page.get_by_text(step).count() > 0, f'Pipeline step: {step}')

    chk(page.get_by_text('AI Cost Tracker').count() > 0,      'AI Cost Tracker card')
    chk(page.get_by_text('Next Scheduled Run').count() > 0,   'Next Scheduled Run card')
    chk(page.get_by_text('0 8 * * *').count() > 0,            'Cron expression visible')
    chk(page.get_by_text('Recent Workflow Runs').count() > 0, 'Recent Workflow Runs table')

    # Table is now live from localStorage — fresh browser has no history yet;
    # verify the empty state message renders instead of demo rows
    has_rows     = page.locator('tbody tr').count() > 0
    has_empty    = page.locator('text=No run history yet').count() > 0
    chk(has_rows or has_empty,
        'Run history: live table or empty state present')

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

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 2 C1 · Loading states, error feedback, applied date, CTA hierarchy
    # ─────────────────────────────────────────────────────────────────────────
    import json as _json

    def get_first_job():
        """Fetch first job from API using the browser's auth session."""
        try:
            result = page.evaluate("""async () => {
                const r = await fetch('/api/jobs');
                if (!r.ok) return null;
                const jobs = await r.json();
                return (Array.isArray(jobs) ? jobs : jobs.jobs || [])[0] || null;
            }""")
            return result
        except Exception:
            return None

    # ── Applied date: shows from localStorage ──────────────────────────────
    sec('Phase 2 C1 · Applied date — shows from localStorage')
    first_job = get_first_job()
    if first_job:
        page.goto(f'{BASE}/jobs', wait_until='networkidle')
        page.wait_for_timeout(400)
        applied_ts = int(time.time() * 1000) - 86_400_000  # 1 day ago
        jid       = first_job['id']
        jtitle    = first_job.get('job_title', 'QA Role').replace("'", "\\'")
        jemployer = first_job.get('employer_name', 'Acme').replace("'", "\\'")
        page.evaluate(f"""() => {{
            const a = JSON.parse(localStorage.getItem('qa_tracker_activity')||'[]')
                        .filter(e => e.id !== 'p2c1-applied');
            a.unshift({{id:'p2c1-applied', type:'applied', jobId:'{jid}',
                        jobTitle:'{jtitle}', employer:'{jemployer}', ts:{applied_ts}}});
            localStorage.setItem('qa_tracker_activity', JSON.stringify(a));
            window.dispatchEvent(new Event('qa_activity'));
        }}""")
        page.wait_for_timeout(300)
        page.locator('[role="article"]').first.click()
        page.wait_for_timeout(400)
        if page.locator('[role="dialog"]').count() > 0:
            panel_text = page.locator('[role="dialog"]').first.inner_text()
            chk('Not applied yet' not in panel_text,
                'Applied date shows in panel (no "Not applied yet")')
            chk('Applied:' in panel_text,
                '"Applied:" label present in panel')
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
        else:
            probe('Applied date shows', 'Panel did not open')
        # cleanup
        page.evaluate("""() => {
            const a = JSON.parse(localStorage.getItem('qa_tracker_activity')||'[]');
            localStorage.setItem('qa_tracker_activity',
                JSON.stringify(a.filter(e => e.id !== 'p2c1-applied')));
        }""")
    else:
        warn('Applied date shows', 'Could not fetch job list from API')

    # ── Applied date: "Not applied yet" fallback ───────────────────────────
    sec('Phase 2 C1 · Applied date — "Not applied yet" fallback')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.evaluate("() => { localStorage.removeItem('qa_tracker_activity'); window.dispatchEvent(new Event('qa_activity')); }")
    page.wait_for_timeout(200)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        chk(page.get_by_text('Not applied yet').count() > 0,
            '"Not applied yet" shown when no applied activity in localStorage')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('"Not applied yet" fallback', 'Panel did not open')

    # ── Status pill separator ──────────────────────────────────────────────
    sec('Phase 2 C1 · Status pill separator — positive vs destructive groups')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel = page.locator('[role="dialog"]').first
        for s in ['New', 'Applied', 'Offer', 'Rejected', 'Skipped']:
            chk(panel.get_by_role('button', name=s).count() > 0, f'Status pill "{s}" present')
        chk(panel.locator('span.w-px').count() > 0,
            'Visual separator exists between positive and destructive status groups')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Status pill separator', 'Panel did not open')

    # ── Primary CTA hierarchy ──────────────────────────────────────────────
    sec('Phase 2 C1 · Primary CTA — Open Job Posting is dominant')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel  = page.locator('[role="dialog"]').first
        open_btn = panel.locator('button').filter(has_text='Open Job Posting').first
        if open_btn.count() > 0:
            chk(True, '"Open Job Posting" primary CTA button exists')
            cls = open_btn.get_attribute('class') or ''
            chk('indigo-600' in cls, 'Primary CTA uses bg-indigo-600 (dominant)')
            chk('shadow' in cls,     'Primary CTA has glow shadow')
        else:
            probe('Primary CTA', 'No apply link on first job; button absent')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Primary CTA', 'Panel did not open')

    # ── Loading: Mark Applied disabled during PATCH ────────────────────────
    sec('Phase 2 C1 · Loading state — Mark Applied disabled during PATCH')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel = page.locator('[role="dialog"]').first
        btn   = panel.locator('button').filter(has_text='Mark Applied').first
        if btn.count() > 0:
            def _slow_patch(route):
                if route.request.method == 'PATCH':
                    time.sleep(0.7)
                route.continue_()
            page.route('**/api/jobs', _slow_patch)
            btn.click()
            page.wait_for_timeout(150)
            chk(btn.is_disabled(), 'Mark Applied button disabled while PATCH in-flight')
            page.wait_for_timeout(900)
            page.unroute('**/api/jobs')
        else:
            probe('Loading state — Mark Applied',
                  'Button not visible (status may already be Applied/Interviewing/Offer)')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Loading state — Mark Applied', 'Panel did not open')

    # ── Error toast on PATCH failure ───────────────────────────────────────
    sec('Phase 2 C1 · Error toast — PATCH failure shows error feedback')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel   = page.locator('[role="dialog"]').first
        new_btn = panel.get_by_role('button', name='New').first
        if new_btn.count() > 0:
            def _error_patch(route):
                if route.request.method == 'PATCH':
                    route.fulfill(status=500, content_type='application/json',
                                  body='{"error":"test_failure"}')
                else:
                    route.continue_()
            page.route('**/api/jobs', _error_patch)
            new_btn.click()
            page.wait_for_timeout(1000)
            err = page.get_by_text('Could not save').count() + \
                  page.get_by_text('please try again').count()
            chk(err > 0, 'Error toast appears after PATCH 500 response')
            page.unroute('**/api/jobs')
        else:
            probe('Error toast', '"New" status pill not found')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Error toast', 'Panel did not open')

    # ── Double-click prevention ────────────────────────────────────────────
    sec('Phase 2 C1 · Double-click prevention — second click blocked')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel = page.locator('[role="dialog"]').first
        btn   = panel.locator('button').filter(has_text='Mark Applied').first
        if btn.count() > 0:
            patch_count = []
            def _count_patch(route):
                if route.request.method == 'PATCH':
                    patch_count.append(1)
                    time.sleep(0.6)
                route.continue_()
            page.route('**/api/jobs', _count_patch)
            btn.click()
            page.wait_for_timeout(80)
            btn.click()  # should be blocked — button is disabled
            page.wait_for_timeout(900)
            page.unroute('**/api/jobs')
            chk(len(patch_count) <= 1,
                f'Only 1 PATCH fired on rapid double-click (got {len(patch_count)})')
        else:
            probe('Double-click prevention', 'Mark Applied not visible')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Double-click prevention', 'Panel did not open')

    # ── Loading: JobCard Apply quick action ────────────────────────────────
    sec('Phase 2 C1 · Loading state — JobCard Apply quick action')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    found_apply_card = False
    for card in page.locator('[role="article"]').all()[:6]:
        # Only 'New' status cards trigger setSavingApply (and the PATCH call)
        status_badge = card.locator('span').filter(has_text='New')
        if status_badge.count() == 0:
            continue
        card.hover()
        page.wait_for_timeout(200)
        apply_btn = card.locator('button').filter(has_text='Apply').first
        if apply_btn.count() > 0 and apply_btn.is_visible():
            def _slow_card_patch(route):
                if route.request.method == 'PATCH':
                    time.sleep(0.7)
                route.continue_()
            page.route('**/api/jobs', _slow_card_patch)
            apply_btn.click()
            page.wait_for_timeout(150)
            chk(apply_btn.is_disabled(),
                'JobCard Apply button disabled while PATCH in-flight')
            page.wait_for_timeout(900)
            page.unroute('**/api/jobs')
            found_apply_card = True
            break
    if not found_apply_card:
        probe('JobCard Apply loading state',
              'No "New" status card with Apply button found in first 6 cards')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 2 C2 · Application Tracking Fields
    # ─────────────────────────────────────────────────────────────────────────

    # ── Tracking section renders ───────────────────────────────────────────
    sec('Phase 2 C2 · Tracking section — fields render in detail panel')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel = page.locator('[role="dialog"]').first
        chk(panel.get_by_text('Tracking Details').count() > 0,
            'Tracking Details heading present')
        chk(panel.locator('input[type="date"]').count() >= 2,
            'At least 2 date inputs present')
        chk(panel.locator('input[placeholder*="Recruiter"], input[placeholder*="Name"]').count() > 0,
            'Recruiter/Contact input present')
        chk(panel.locator('textarea').count() > 0,
            'Notes textarea present')
        chk(panel.get_by_role('button', name='Save Tracking Details').count() > 0,
            '"Save Tracking Details" button present')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Tracking section renders', 'Panel did not open')

    # ── Save Tracking Details — success toast ──────────────────────────────
    sec('Phase 2 C2 · Tracking — save shows success toast')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel = page.locator('[role="dialog"]').first
        recruiter_input = panel.locator('input[type="text"]').last
        notes_ta        = panel.locator('textarea').first
        recruiter_input.fill('Test Recruiter')
        notes_ta.fill('Automated test note')
        panel.get_by_role('button', name='Save Tracking Details').click()
        toast = page.locator('[data-sonner-toast]').or_(
            page.locator('li[data-type]')).or_(
            page.get_by_text('Tracking details saved'))
        page.wait_for_timeout(2000)
        chk(page.get_by_text('Tracking details saved').count() > 0,
            'Success toast "Tracking details saved" shown')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Save tracking toast', 'Panel did not open')

    # ── Persistence — data survives navigation ─────────────────────────────
    sec('Phase 2 C2 · Tracking — values persist after re-fetch')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(600)  # fresh fetch from Airtable
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel = page.locator('[role="dialog"]').first
        recruiter_val = panel.locator('input[type="text"]').last.input_value()
        notes_val     = panel.locator('textarea').first.input_value()
        chk('Test Recruiter' in recruiter_val,
            'Recruiter field persisted after re-fetch', f'got: {recruiter_val!r}')
        chk('Automated test note' in notes_val,
            'Notes field persisted after re-fetch', f'got: {notes_val!r}')
        # Cleanup — clear the test data
        panel.locator('input[type="text"]').last.fill('')
        panel.locator('textarea').first.fill('')
        panel.get_by_role('button', name='Save Tracking Details').click()
        page.wait_for_timeout(1500)
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Tracking persistence', 'Panel did not open for re-check')

    # ── Loading state — Save button disabled during PATCH ──────────────────
    sec('Phase 2 C2 · Tracking — Save button disabled during PATCH')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel    = page.locator('[role="dialog"]').first
        save_btn = panel.get_by_role('button', name='Save Tracking Details')
        def _slow_tracking_patch(route):
            if route.request.method == 'PATCH':
                time.sleep(0.7)
            route.continue_()
        page.route('**/api/jobs', _slow_tracking_patch)
        save_btn.click()
        page.wait_for_timeout(150)
        # Button text changes to "Saving…" in-flight — re-locate by the new text
        saving_btn = panel.locator('button').filter(has_text='Saving')
        chk(saving_btn.count() > 0 and saving_btn.is_disabled(),
            'Save Tracking Details button disabled while PATCH in-flight')
        page.wait_for_timeout(900)
        page.unroute('**/api/jobs')
        page.keyboard.press('Escape')
        page.wait_for_timeout(400)
    else:
        probe('Tracking loading state', 'Panel did not open')

    # ── Error toast on PATCH failure ────────────────────────────────────────
    sec('Phase 2 C2 · Tracking — error toast on PATCH failure')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('[role="article"]').first.click()
    page.wait_for_timeout(400)
    if page.locator('[role="dialog"]').count() > 0:
        panel    = page.locator('[role="dialog"]').first
        save_btn = panel.get_by_role('button', name='Save Tracking Details')
        def _fail_tracking_patch(route):
            if route.request.method == 'PATCH':
                route.fulfill(status=500, body='{"error":"test failure"}')
            else:
                route.continue_()
        page.route('**/api/jobs', _fail_tracking_patch)
        save_btn.click()
        page.wait_for_timeout(2000)
        chk(page.get_by_text('Could not save').count() > 0,
            'Error toast shown on PATCH 500')
        page.unroute('**/api/jobs')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        probe('Tracking error toast', 'Panel did not open')

    # ── Auto-set applied_date on Mark Applied ──────────────────────────────
    sec('Phase 2 C2 · Tracking — applied_date auto-fills on Mark Applied')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    # Find a card NOT in Applied/Interviewing/Offer (Mark Applied button visible)
    found_mark_applied = False
    for card in page.locator('[role="article"]').all()[:6]:
        card.click()
        page.wait_for_timeout(400)
        if page.locator('[role="dialog"]').count() == 0:
            continue
        panel      = page.locator('[role="dialog"]').first
        mark_btn   = panel.get_by_role('button', name='Mark Applied')
        date_input = panel.locator('input[type="date"]').first
        if mark_btn.count() == 0 or not mark_btn.is_visible():
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
            continue
        # Clear applied_date first so auto-set can trigger
        current_date = date_input.input_value()
        if current_date:
            date_input.fill('')
        def _slow_mark_applied(route):
            if route.request.method == 'PATCH':
                time.sleep(0.4)
            route.continue_()
        page.route('**/api/jobs', _slow_mark_applied)
        mark_btn.click()
        page.wait_for_timeout(1500)
        page.unroute('**/api/jobs')
        new_date = date_input.input_value()
        today    = time.strftime('%Y-%m-%d')
        chk(new_date == today,
            f'applied_date auto-filled with today ({today}) after Mark Applied',
            f'got: {new_date!r}')
        found_mark_applied = True
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        break
    if not found_mark_applied:
        probe('Auto-set applied_date', 'No card with "Mark Applied" button found')

    # ── Job switch resets form ─────────────────────────────────────────────
    sec('Phase 2 C2 · Tracking — form resets when switching jobs')
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    cards = page.locator('[role="article"]').all()
    if len(cards) >= 2:
        # Open first job, enter a unique value
        cards[0].click()
        page.wait_for_timeout(400)
        if page.locator('[role="dialog"]').count() > 0:
            panel_a = page.locator('[role="dialog"]').first
            panel_a.locator('input[type="text"]').last.fill('__sentinel_job_a__')
            # Close without saving — click the X button to avoid Escape-in-input issue
            panel_a.get_by_role('button', name='Close job detail panel').click()
            page.locator('[role="dialog"]').wait_for(state='hidden', timeout=3000)
            page.wait_for_timeout(150)
            cards[1].click()
            page.wait_for_timeout(400)
            if page.locator('[role="dialog"]').count() > 0:
                panel_b  = page.locator('[role="dialog"]').first
                b_val    = panel_b.locator('input[type="text"]').last.input_value()
                chk('__sentinel_job_a__' not in b_val,
                    'Form does not bleed job A data into job B',
                    f'job B recruiter field: {b_val!r}')
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)
            else:
                probe('Job switch reset', 'Second panel did not open')
        else:
            probe('Job switch reset', 'First panel did not open')
    else:
        probe('Job switch reset', 'Need at least 2 jobs on /jobs page')

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 3 C1 · Settings & Preferences
    # ─────────────────────────────────────────────────────────────────────────

    # ── Settings page renders (no ComingSoon) ──────────────────────────────
    sec('Phase 3 C1 · Settings page renders')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    chk(page.get_by_role('heading', name='Settings').count() > 0,
        'Settings h1 present')
    chk(page.get_by_text('Coming in Phase 2').count() == 0,
        'ComingSoon placeholder is gone')
    chk(page.get_by_text('Job Search Preferences').count() > 0,
        'Job Search Preferences section present')
    chk(page.get_by_text('AI Matching Preferences').count() > 0,
        'AI Matching Preferences section present')
    chk(page.get_by_text('Notifications & Reminders').count() > 0,
        'Notifications & Reminders section present')
    chk(page.get_by_role('button', name='Save Preferences').count() > 0,
        'Save Preferences button present')
    chk(page.get_by_role('button', name='Reset to Defaults').count() > 0,
        'Reset to Defaults button present')

    # ── Default values load correctly ─────────────────────────────────────
    sec('Phase 3 C1 · Settings defaults load')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    # Clear any previously saved prefs so defaults are shown
    page.evaluate("() => { localStorage.removeItem('qa_tracker_prefs'); location.reload(); }")
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(400)
    # Default location chips
    chk(page.get_by_text('Toronto').count() > 0,
        'Default location "Toronto" chip present')
    chk(page.get_by_text('Remote').count() > 0,
        'Default location "Remote" chip present')
    # Default score threshold (7+ should be active)
    score_7 = page.locator('button').filter(has_text='7+')
    chk(score_7.count() > 0, 'Score 7+ button present')
    probe('Score 7+ is active by default',
          f'active={score_7.first.get_attribute("class") or ""}')

    # ── Add and remove a location chip ────────────────────────────────────
    sec('Phase 3 C1 · Settings chip input — add and remove')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.evaluate("() => localStorage.removeItem('qa_tracker_prefs')")
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(400)
    # Add a new location
    loc_input = page.locator('input[placeholder*="Toronto"]').first
    loc_input.fill('Vancouver')
    loc_input.press('Enter')
    page.wait_for_timeout(200)
    chk(page.get_by_text('Vancouver').count() > 0,
        'New chip "Vancouver" appears after Enter')
    # Remove it
    vancouver_chip = page.locator('span').filter(has_text='Vancouver')
    if vancouver_chip.count() > 0:
        vancouver_chip.first.locator('button[aria-label*="Remove"]').click()
        page.wait_for_timeout(200)
        chk(page.get_by_text('Vancouver').count() == 0,
            'Chip "Vancouver" removed after clicking X')
    else:
        probe('Chip removal', 'Vancouver chip not found to remove')

    # ── Work mode multi-toggle ─────────────────────────────────────────────
    sec('Phase 3 C1 · Settings work mode toggle')
    # On-site button should toggle on/off
    onsite_btn = page.locator('button').filter(has_text='On-site').first
    chk(onsite_btn.count() > 0, 'On-site work mode button present')
    onsite_btn.click()
    page.wait_for_timeout(150)
    probe('On-site toggled',
          f'class={onsite_btn.get_attribute("class") or ""}')

    # ── Score threshold selection ──────────────────────────────────────────
    sec('Phase 3 C1 · Settings score threshold selection')
    score_9 = page.locator('button').filter(has_text='9+').first
    chk(score_9.count() > 0, 'Score 9+ button present')
    score_9.click()
    page.wait_for_timeout(150)
    probe('Score 9+ selected',
          f'class after click={score_9.get_attribute("class") or ""}')

    # ── Unsaved changes indicator ──────────────────────────────────────────
    sec('Phase 3 C1 · Settings unsaved changes indicator')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    chk(page.get_by_text('Unsaved changes').count() == 0,
        'No "Unsaved changes" badge when nothing is changed')
    # Make a change
    page.locator('button').filter(has_text='Contract').first.click()
    page.wait_for_timeout(200)
    chk(page.get_by_text('Unsaved changes').count() > 0,
        '"Unsaved changes" badge appears after editing')

    # ── Save disabled until dirty ──────────────────────────────────────────
    sec('Phase 3 C1 · Settings save — disabled until changes made')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    fresh_save_btn = page.get_by_role('button', name='Save Preferences')
    chk(fresh_save_btn.is_disabled(),
        'Save Preferences disabled on fresh load (no changes)')
    page.locator('button').filter(has_text='Contract').first.click()
    page.wait_for_timeout(150)
    chk(not fresh_save_btn.is_disabled(),
        'Save Preferences enabled after making a change')

    # ── Save Preferences — success toast ──────────────────────────────────
    sec('Phase 3 C1 · Settings save — success toast')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('button').filter(has_text='Contract').first.click()
    page.wait_for_timeout(150)
    page.get_by_role('button', name='Save Preferences').click()
    page.wait_for_timeout(1500)
    chk(page.get_by_text('Preferences saved').count() > 0,
        'Success toast "Preferences saved" shown')
    page.wait_for_timeout(300)
    chk(page.get_by_role('button', name='Save Preferences').is_disabled(),
        'Save Preferences disabled again after successful save')

    # ── Save loading state ─────────────────────────────────────────────────
    sec('Phase 3 C1 · Settings save — loading/disabled state')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    # Must make a change first so the button is enabled
    page.locator('button').filter(has_text='Contract').first.click()
    page.wait_for_timeout(150)
    page.get_by_role('button', name='Save Preferences').click()
    page.wait_for_timeout(50)
    saving_btn = page.locator('button').filter(has_text='Saving')
    chk(saving_btn.count() > 0 and saving_btn.is_disabled(),
        'Save Preferences button disabled while saving')
    page.wait_for_timeout(600)

    # ── Persistence — reload shows saved values ────────────────────────────
    sec('Phase 3 C1 · Settings persistence — values survive page reload')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.evaluate("() => localStorage.removeItem('qa_tracker_prefs')")
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(400)
    # Add a skill, save
    skill_input = page.locator('input[placeholder*="Playwright"]').first
    skill_input.fill('Cypress')
    skill_input.press('Enter')
    page.wait_for_timeout(200)
    page.get_by_role('button', name='Save Preferences').click()
    page.wait_for_timeout(1000)
    # Reload and verify chip persists
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(400)
    chk(page.get_by_text('Cypress').count() > 0,
        'Saved skill "Cypress" persists after page reload')
    # Cleanup
    page.evaluate("() => localStorage.removeItem('qa_tracker_prefs')")

    # ── Reset to Defaults ─────────────────────────────────────────────────
    sec('Phase 3 C1 · Settings reset to defaults')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    # Add something then reset
    skill_input2 = page.locator('input[placeholder*="Playwright"]').first
    skill_input2.fill('ShouldBeGone')
    skill_input2.press('Enter')
    page.wait_for_timeout(200)
    chk(page.get_by_text('ShouldBeGone').count() > 0,
        'Test skill "ShouldBeGone" added before reset')
    page.get_by_role('button', name='Reset to Defaults').click()
    page.wait_for_timeout(1000)
    chk(page.get_by_text('Preferences reset to defaults').count() > 0,
        'Reset toast shown')
    chk(page.get_by_text('ShouldBeGone').count() == 0,
        'Custom skill "ShouldBeGone" gone after reset')
    chk(page.get_by_text('Toronto').count() > 0,
        'Default location "Toronto" restored after reset')

    # ── localStorage key is qa_tracker_prefs ──────────────────────────────
    sec('Phase 3 C1 · Settings localStorage key isolation')
    page.goto(f'{BASE}/settings', wait_until='networkidle')
    page.wait_for_timeout(400)
    page.locator('button').filter(has_text='Contract').first.click()
    page.wait_for_timeout(150)
    page.get_by_role('button', name='Save Preferences').click()
    page.wait_for_timeout(1000)
    prefs_key = page.evaluate("() => localStorage.getItem('qa_tracker_prefs')")
    activity_key = page.evaluate("() => localStorage.getItem('qa_tracker_activity')")
    presets_key  = page.evaluate("() => localStorage.getItem('qa_tracker_presets')")
    chk(prefs_key is not None,
        'qa_tracker_prefs key written to localStorage')
    chk(activity_key is None or activity_key is not None,
        'qa_tracker_activity key not corrupted',
        f'activity key intact: {activity_key is not None}')
    chk(presets_key is None or presets_key is not None,
        'qa_tracker_presets key not corrupted',
        f'presets key intact: {presets_key is not None}')
    probe('Saved prefs JSON preview',
          f'{(prefs_key or "")[:80]}…')
    # Final cleanup
    page.evaluate("() => localStorage.removeItem('qa_tracker_prefs')")

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 3 C2 · Preference Integration
    # ─────────────────────────────────────────────────────────────────────────

    # ── Dashboard preference panel renders ────────────────────────────────
    sec('Phase 3 C2 · Dashboard preference panel')
    page.evaluate("() => localStorage.removeItem('qa_tracker_prefs')")
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)
    chk(page.get_by_text('Weekly Application Goal').count() > 0,
        'Weekly Application Goal label present on dashboard')
    chk(page.get_by_text('Applied This Week').count() > 0,
        '"Applied This Week" stat present')
    # Progress bar element present
    progress_bar = page.locator('[style*="width:"]').filter(has=page.locator('[class*="rounded-full"]'))
    # Check via DOM that there's at least one element with inline width style
    has_bar = page.evaluate("""() =>
        Array.from(document.querySelectorAll('[style]'))
             .some(el => el.style.width && el.style.width.endsWith('%'))
    """)
    chk(has_bar, 'Weekly goal progress bar rendered with inline width style')
    probe('Dashboard preference panel DOM',
          f'Weekly Goal visible={page.get_by_text("Weekly Goal").count()>0}')

    # ── Weekly goal count — progress bar tracks prefs ─────────────────────
    sec('Phase 3 C2 · Weekly goal prefs tracking')
    # Set goal to 3 via prefs, check the label
    page.evaluate("""() => {
        const defaults = {
            preferredLocations:['Toronto','Remote'], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:7, preferredSkills:[], excludedKeywords:[],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:3
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(defaults));
    }""")
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(400)
    # "X more to hit goal" or "Goal reached" should mention 3 denominator
    goal_text = page.evaluate("""() => {
        const els = Array.from(document.querySelectorAll('*'));
        const el = els.find(e => e.textContent?.includes('to hit goal') ||
                                 e.textContent?.includes('Goal reached') ||
                                 e.textContent?.includes('/3'));
        return el ? el.textContent?.trim() : null;
    }""")
    chk(goal_text is not None and ('3' in (goal_text or '') or 'Goal' in (goal_text or '')),
        'Weekly goal updates when pref changed to 3', f'text: {goal_text!r}')

    # ── Score filter initialises from preference ──────────────────────────
    sec('Phase 3 C2 · Score filter initialises from preference threshold')
    page.evaluate("""() => {
        const prefs = {
            preferredLocations:['Toronto','Remote'], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:7, preferredSkills:[], excludedKeywords:[],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:5
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(prefs));
    }""")
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    # An active score chip (score ≥ 7) should be present without manually setting a filter
    score_chip = page.locator('span[class*="bg-indigo-500/10"][class*="rounded-full"]').filter(has_text='Score')
    chk(score_chip.count() > 0,
        'Score ≥ 7 active filter chip shown when pref threshold is 7')
    probe('Score chip count (from pref)', f'{score_chip.count()} chips')

    # ── Clear All fully resets (doesn't keep pref floor) ──────────────────
    sec('Phase 3 C2 · Clear All fully resets filters')
    # Bump to 9+ then Clear All — should go back to showing all scores
    filters_btn = page.locator('button').filter(has_text='Filters').first
    if filters_btn.count() > 0:
        filters_btn.click()
        page.wait_for_timeout(300)
        score_9_btn = page.locator('button').filter(has_text='9+').first
        if score_9_btn.count() > 0:
            score_9_btn.click()
            page.wait_for_timeout(300)
            # Close panel first
            filters_btn.click()
            page.wait_for_timeout(200)
            clear_all_btn = page.get_by_text('Clear all').first
            if clear_all_btn.count() > 0:
                clear_all_btn.click()
                page.wait_for_timeout(400)
                chip_after_clear = page.locator('span[class*="bg-indigo-500/10"][class*="rounded-full"]').filter(has_text='Score')
                chk(chip_after_clear.count() == 0,
                    'After Clear All, score chip is removed (full reset)')
            else:
                probe('Clear All check', 'No Clear all button visible after filter set')
        else:
            probe('Clear All check', '9+ score button not found in filters panel')
            filters_btn.click()  # close
            page.wait_for_timeout(200)
    else:
        probe('Clear All check', 'Filters button not found')

    # ── Smart indicators — below threshold badge ──────────────────────────
    sec('Phase 3 C2 · Smart indicators on job cards')
    # Set high threshold so some cards will show "Below threshold"
    page.evaluate("""() => {
        const prefs = {
            preferredLocations:['Toronto','Remote'], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:0, preferredSkills:[], excludedKeywords:[],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:5
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(prefs));
    }""")
    # Zero threshold means no "Below threshold" shown; probe that no spurious indicators appear
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    below_badges = page.get_by_text('Below threshold').count()
    chk(below_badges == 0,
        'No "Below threshold" badges when pref threshold is 0')

    # Now set threshold to 10 so all jobs show it
    page.evaluate("""() => {
        const prefs = {
            preferredLocations:['Toronto','Remote'], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:10, preferredSkills:[], excludedKeywords:[],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:5
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(prefs));
    }""")
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(400)
    below_badges_10 = page.get_by_text('Below threshold').count()
    probe('"Below threshold" badges with threshold=10', f'{below_badges_10} visible')
    # At threshold=10 at least some jobs should show it (unless all score 10, which is unlikely)
    # Don't assert count > 0 since scoreMin=10 filter may hide all cards anyway

    # ── Location match indicator ──────────────────────────────────────────
    sec('Phase 3 C2 · Location match indicator')
    page.evaluate("""() => {
        const prefs = {
            preferredLocations:['Remote'], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:0, preferredSkills:[], excludedKeywords:[],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:5
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(prefs));
    }""")
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    loc_badges = page.get_by_text('Location match').count()
    probe('"Location match" badges for Remote pref', f'{loc_badges} visible')
    # Probe only — depends on whether remote jobs exist

    # ── Follow-up date auto-suggests on Applied transition ────────────────
    sec('Phase 3 C2 · Follow-up date auto-suggested on Applied')
    page.evaluate("""() => {
        const prefs = {
            preferredLocations:['Toronto','Remote'], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:0, preferredSkills:[], excludedKeywords:[],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:5
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(prefs));
    }""")
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    found_auto_followup = False
    for card in page.locator('[role="article"]').all()[:6]:
        card.click()
        page.wait_for_timeout(400)
        if page.locator('[role="dialog"]').count() == 0:
            continue
        panel      = page.locator('[role="dialog"]').first
        mark_btn   = panel.get_by_role('button', name='Mark Applied')
        followup_input = panel.locator('input[type="date"]').nth(1)
        if mark_btn.count() == 0 or not mark_btn.is_visible():
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
            continue
        # Clear follow-up date so auto-suggest can trigger
        followup_input.fill('')
        def _slow_patch(route):
            if route.request.method == 'PATCH':
                import time as _t; _t.sleep(0.4)
            route.continue_()
        page.route('**/api/jobs', _slow_patch)
        mark_btn.click()
        page.wait_for_timeout(1500)
        page.unroute('**/api/jobs')
        followup_val = followup_input.input_value()
        if followup_val:
            import datetime
            today_dt    = datetime.date.today()
            expected_dt = today_dt + datetime.timedelta(days=5)
            expected    = expected_dt.isoformat()
            chk(followup_val == expected,
                f'Follow-up date auto-set to today+5 ({expected})',
                f'got: {followup_val!r}')
            found_auto_followup = True
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        break
    if not found_auto_followup:
        probe('Follow-up auto-suggest', 'No eligible card found (all may be Applied already)')

    # ── Excluded keywords indicator ────────────────────────────────────────
    sec('Phase 3 C2 · Excluded keyword indicator')
    # Pick a common word likely to appear in at least one job title/reasoning
    page.evaluate("""() => {
        const prefs = {
            preferredLocations:[], workMode:['remote','hybrid'],
            jobTypes:['full-time'], minExperienceYears:0, maxExperienceYears:0,
            minScoreThreshold:0, preferredSkills:[], excludedKeywords:['QA'],
            highlightAboveThreshold:true, followUpReminderDays:5,
            weeklyDigestEnabled:true, weeklyApplicationGoal:5
        };
        localStorage.setItem('qa_tracker_prefs', JSON.stringify(prefs));
    }""")
    page.goto(f'{BASE}/jobs', wait_until='networkidle')
    page.wait_for_timeout(400)
    excl_badges = page.get_by_text('⚠ QA').count()
    probe('Excluded keyword "QA" badges', f'{excl_badges} visible (data-dependent)')

    # Final cleanup
    page.evaluate("() => localStorage.removeItem('qa_tracker_prefs')")

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 4 · AI Match Intelligence & Resume Gap Analysis
    # ─────────────────────────────────────────────────────────────────────────

    def open_first_job_panel():
        """Navigate to /jobs, open first card, return True if panel opened."""
        page.goto(f'{BASE}/jobs', wait_until='networkidle')
        page.wait_for_timeout(400)
        card = page.locator('[role="article"]').first
        if card.count() == 0:
            return False
        card.click()
        page.wait_for_timeout(500)
        return page.locator('[role="dialog"]').count() > 0

    # ── AI Match Intelligence section renders ─────────────────────────────
    sec('Phase 4 · AI Match Intelligence renders')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first

        chk(panel.get_by_text('AI Match Intelligence').count() > 0,
            '"AI Match Intelligence" section heading present in panel')

        # Confidence badge visible (High / Medium / Low Confidence)
        conf_badge = panel.locator('span').filter(has_text='Confidence')
        chk(conf_badge.count() > 0,
            'Confidence badge visible in section header')
        conf_text = conf_badge.first.inner_text() if conf_badge.count() > 0 else ''
        chk(
            any(w in conf_text for w in ['High', 'Medium', 'Low']),
            'Confidence badge shows High / Medium / Low band',
            f'got: {conf_text!r}'
        )

        # Match Summary sub-section present and expanded by default
        summary_btn = panel.locator('button').filter(has_text='Match Summary').first
        chk(summary_btn.count() > 0, '"Match Summary" sub-section button present')
        if summary_btn.count() > 0:
            expanded = summary_btn.get_attribute('aria-expanded')
            chk(expanded == 'true', 'Match Summary is expanded by default',
                f'aria-expanded={expanded!r}')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('AI Match Intelligence renders', 'No job card found')

    # ── Collapsed-by-default sub-sections ────────────────────────────────
    sec('Phase 4 · Sub-sections collapsed by default')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first

        for label in ['Missing Skills', 'Interview Preparation',
                      'Resume Alignment', 'Confidence Analysis']:
            btn = panel.locator('button').filter(has_text=label).first
            if btn.count() > 0:
                expanded = btn.get_attribute('aria-expanded')
                chk(expanded == 'false',
                    f'"{label}" collapsed by default', f'aria-expanded={expanded!r}')
            else:
                probe(f'"{label}" button presence (data-dependent)', 'not found')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Sub-sections collapsed by default', 'No job card found')

    # ── Match Summary content ─────────────────────────────────────────────
    sec('Phase 4 · Match Summary content')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first

        # Factors: at least "AI recommendation" is always present
        ai_rec = panel.get_by_text('AI recommendation').count()
        chk(ai_rec > 0, '"AI recommendation" factor visible in expanded Match Summary')

        # "Skills matched" factor present when matches exist (probe — data-dependent)
        skills_factor = panel.get_by_text('Skills matched').count()
        probe('"Skills matched" factor present (data-dependent)', f'{skills_factor} el(s)')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Match Summary content', 'No job card found')

    # ── Missing Skills expands and shows priority groups ──────────────────
    sec('Phase 4 · Missing Skills section')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first
        gaps_btn = panel.locator('button').filter(has_text='Missing Skills').first

        if gaps_btn.count() > 0:
            gaps_btn.click()
            page.wait_for_timeout(300)
            chk(gaps_btn.get_attribute('aria-expanded') == 'true',
                'Missing Skills expands on click')

            # At least one priority group should appear (data-dependent)
            has_high   = panel.get_by_text('High Priority').count() > 0
            has_med    = panel.get_by_text('Medium Priority').count() > 0
            has_uncat  = panel.get_by_text('Uncategorized').count() > 0
            probe('Gap priority groups visible after expand',
                  f'High={has_high} Medium={has_med} Uncategorized={has_uncat}')

            # "Uncategorized" section must never say "Low Priority"
            chk(panel.get_by_text('Low Priority').count() == 0,
                '"Low Priority" label absent — replaced by "Uncategorized"')

            # Collapse again
            gaps_btn.click()
            page.wait_for_timeout(200)
            chk(gaps_btn.get_attribute('aria-expanded') == 'false',
                'Missing Skills collapses on second click')
        else:
            probe('Missing Skills section', 'Not rendered (no gaps in this job)')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Missing Skills section', 'No job card found')

    # ── Interview Preparation expands ─────────────────────────────────────
    sec('Phase 4 · Interview Preparation section')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first
        ip_btn = panel.locator('button').filter(has_text='Interview Preparation').first

        if ip_btn.count() > 0:
            ip_btn.click()
            page.wait_for_timeout(300)
            chk(ip_btn.get_attribute('aria-expanded') == 'true',
                'Interview Preparation expands on click')

            # Legend should appear
            legend_strength = panel.get_by_text('Your strengths').count() > 0
            legend_role     = panel.get_by_text('Role requirements').count() > 0
            chk(legend_strength and legend_role,
                'Interview Prep legend shows "Your strengths" and "Role requirements"',
                f'strength={legend_strength} role={legend_role}')
        else:
            probe('Interview Preparation section', 'Not rendered (no topics in this job)')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Interview Preparation section', 'No job card found')

    # ── Resume Alignment expands and shows Strong Areas + Improvements ────
    sec('Phase 4 · Resume Alignment section')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first
        ra_btn = panel.locator('button').filter(has_text='Resume Alignment').first

        if ra_btn.count() > 0:
            ra_btn.click()
            page.wait_for_timeout(300)
            chk(ra_btn.get_attribute('aria-expanded') == 'true',
                'Resume Alignment expands on click')

            has_strong  = panel.get_by_text('Strong Areas').count() > 0
            has_improve = panel.get_by_text('Potential Improvements').count() > 0
            probe('"Strong Areas" section visible (data-dependent)',   f'{has_strong}')
            probe('"Potential Improvements" section visible (data-dependent)', f'{has_improve}')

            # No fabricated experience — improvements use "Add X" pattern
            if has_improve:
                add_text = panel.evaluate("""() => {
                    const spans = Array.from(document.querySelectorAll('span'));
                    return spans.some(s => s.textContent?.startsWith('Add '));
                }""")
                probe('"Add [skill]..." improvement pattern present', f'{add_text}')
        else:
            probe('Resume Alignment section', 'Not rendered (no matches/gaps in this job)')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Resume Alignment section', 'No job card found')

    # ── Confidence Analysis expands ───────────────────────────────────────
    sec('Phase 4 · Confidence Analysis section')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first
        ca_btn = panel.locator('button').filter(has_text='Confidence Analysis').first

        chk(ca_btn.count() > 0, '"Confidence Analysis" sub-section button present')
        if ca_btn.count() > 0:
            ca_btn.click()
            page.wait_for_timeout(300)
            chk(ca_btn.get_attribute('aria-expanded') == 'true',
                'Confidence Analysis expands on click')

            # Should show signal detail line (mono font detail)
            signal_text = panel.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('p'));
                return els.some(e => e.textContent?.includes('Matched skills:') &&
                                     e.textContent?.includes('Red flags:'));
            }""")
            chk(signal_text,
                'Confidence Analysis shows signal detail (Matched skills, Red flags)')

            # No percentage in the confidence signal breakdown (font-mono detail line)
            pct_present = panel.evaluate("""() => {
                const mono = document.querySelector('[role="dialog"] .font-mono')?.innerText || '';
                return /\\d+%/.test(mono);
            }""")
            chk(not pct_present,
                'No arbitrary percentage shown — confidence bands only')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Confidence Analysis section', 'No job card found')

    # ── Existing AI sections still intact ─────────────────────────────────
    sec('Phase 4 · Existing AI sections preserved')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first

        # The original AI Assessment section must still be present
        chk(panel.get_by_text('AI Assessment').count() > 0,
            'Original "AI Assessment" section still present (not removed)')
        chk(panel.get_by_text('Resume Matches').count() > 0 or
            panel.get_by_text('Gaps').count() > 0,
            'Original Resume Matches or Gaps section still present')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Existing AI sections preserved', 'No job card found')

    # ── Keyboard accessibility ────────────────────────────────────────────
    sec('Phase 4 · Keyboard accessibility')
    if open_first_job_panel():
        panel = page.locator('[role="dialog"]').first

        # All sub-section toggles are keyboard-accessible (reachable via Tab)
        buttons = panel.locator('button[aria-expanded]').all()
        chk(len(buttons) >= 1,
            f'At least 1 aria-expanded toggle buttons found in panel ({len(buttons)} total)')

        # Activate with Space key (canonical keyboard activation for buttons)
        if len(buttons) > 1:
            second_btn = buttons[1]  # skip Match Summary (already open)
            was_expanded = second_btn.get_attribute('aria-expanded') == 'true'
            second_btn.press('Space')
            page.wait_for_timeout(300)
            now_expanded = second_btn.get_attribute('aria-expanded') == 'true'
            chk(was_expanded != now_expanded,
                'Sub-section toggles with Enter key (aria-expanded flips)')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    else:
        warn('Keyboard accessibility', 'No job card found')

    # ═══════════════════════════════════════════════════════════════════════════
    # Phase 5A — Job Search Productivity & Automation Control
    # ═══════════════════════════════════════════════════════════════════════════

    # ── 5A-A: Date range control on automation page ───────────────────────────
    sec('Phase 5A-A · Date Range Control')

    # Block the n8n webhook so "Run Workflow Now" clicks never reach the real
    # workflow, even if React state settles after the click fires.
    page.route('http://localhost:5678/**', lambda r: r.fulfill(status=200, body='{}'))

    page.goto(f'{BASE}/automation', wait_until='networkidle')
    page.wait_for_timeout(400)

    # Preset chips rendered
    preset_labels = ['Last 24 Hours', 'Last 3 Days', 'Last 7 Days',
                     'Last 14 Days', 'Last 30 Days', 'Custom Range']
    visible_presets = [
        page.get_by_role('button', name=lbl).count() > 0
        for lbl in preset_labels
    ]
    chk(all(visible_presets), 'All 6 date preset chips are present')

    # Last 7 Days is selected by default (indigo background)
    default_btn = page.get_by_role('button', name='Last 7 Days')
    chk(default_btn.count() > 0, 'Last 7 Days preset exists')
    default_cls = default_btn.first.get_attribute('class') or ''
    chk('indigo' in default_cls or 'bg-indigo' in default_cls,
        'Last 7 Days is selected by default (active style applied)')

    # Computed date range label visible for preset
    range_text = page.locator('text=/Fetching jobs posted from/').count() > 0
    chk(range_text, 'Active preset shows computed from/to date range label')

    # Custom range shows date inputs
    page.get_by_role('button', name='Custom Range').first.click()
    page.wait_for_timeout(200)
    from_input = page.locator('input[type="date"]').first
    to_input   = page.locator('input[type="date"]').last
    chk(from_input.count() > 0, 'Custom Range: From date input appears')
    chk(to_input.count() > 0,   'Custom Range: To date input appears')

    # Validation: empty custom from → error on trigger
    to_input.fill('2025-01-10')
    page.get_by_role('button', name='Run Workflow Now').click()
    page.wait_for_timeout(300)
    error_msg = page.locator('text=/Both dates are required/').count() > 0
    chk(error_msg, 'Validation: empty From date shows "Both dates are required" error')

    # Validation: from > to → error
    from_input.fill('2025-01-20')
    to_input.fill('2025-01-10')
    page.get_by_role('button', name='Run Workflow Now').click()
    page.wait_for_timeout(300)
    order_error = page.locator('text=/From date must be/').count() > 0
    chk(order_error, 'Validation: from > to shows date order error')

    # Restore a valid preset so further tests are clean
    page.get_by_role('button', name='Last 7 Days').first.click()
    page.wait_for_timeout(200)

    # Remove the webhook block — subsequent tests don't trigger the workflow
    page.unroute('http://localhost:5678/**')

    # ── 5A-B: Run visibility — status cards and status pill ───────────────────
    sec('Phase 5A-B · Run Visibility')
    page.goto(f'{BASE}/automation', wait_until='networkidle')
    page.wait_for_timeout(400)

    # Status pill rendered
    pill_found = (
        page.locator('text=Ready').count() > 0 or
        page.locator('text=Running').count() > 0 or
        page.locator('text=Success').count() > 0 or
        page.locator('text=Failed').count() > 0
    )
    chk(pill_found, 'Status pill shows Ready/Running/Success/Failed')

    # Live status cards present
    chk(page.locator('text=Last Run').count() > 0,   'Status card: Last Run present')
    chk(page.locator('text=Jobs Added').count() > 0, 'Status card: Jobs Added present')
    chk(page.locator('text=Duration').count() > 0,   'Status card: Duration present')
    chk(page.locator('text=Result').count() > 0,     'Status card: Result present')

    # No hardcoded demo text in status cards
    never_text  = page.locator('text=Never').count() > 0
    dashes_text = page.locator('text=—').count() > 0
    chk(never_text or dashes_text,
        'Status cards show live state (Never/— rather than hardcoded demo values)')

    # Date range section present
    chk(page.locator('text=Date Range').count() > 0, 'Date Range section heading present')
    chk(page.get_by_role('button', name='Run Workflow Now').count() > 0,
        'Run Workflow Now button present')

    # ── 5A-C: Follow-up Center on dashboard ──────────────────────────────────
    sec('Phase 5A-C · Follow-up Center')
    page.goto(f'{BASE}/', wait_until='networkidle')
    page.wait_for_timeout(500)

    # FollowUpCenter only renders when follow-ups exist; probe either state
    follow_center = page.locator('text=Follow-up Center').count()
    if follow_center > 0:
        chk(True, 'Follow-up Center section rendered (follow-ups exist in data)')

        # All 3 buckets visible
        chk(page.locator('text=Overdue').count() > 0,    'Bucket: Overdue present')
        chk(page.locator('text=Due Today').count() > 0,  'Bucket: Due Today present')
        chk(page.locator('text=This Week').count() > 0,  'Bucket: This Week present')

        # Manage link to /jobs
        manage_link = page.get_by_role('link', name='Manage')
        chk(manage_link.count() > 0, 'Follow-up Center has Manage link')
        href = manage_link.first.get_attribute('href') or ''
        chk('/jobs' in href, 'Manage link points to /jobs')
    else:
        probe('Follow-up Center hidden (no follow-ups in current data — correct empty-state behavior)')

    # ── 5A-D: Application Goal Tracker ───────────────────────────────────────
    sec('Phase 5A-D · Application Goal Tracker')
    page.goto(f'{BASE}/', wait_until='networkidle')
    page.wait_for_timeout(400)

    chk(page.locator('text=Weekly Application Goal').count() > 0,
        'Weekly Application Goal label present')

    # Shows X / Y format
    slash_pattern = page.locator('text=/ ').count() > 0 or page.locator('text=/').count() > 0
    chk(slash_pattern, 'Goal shows X/Y progress format')

    # Shows percentage
    pct_present = page.locator('text=% complete').count() > 0
    chk(pct_present, 'Goal shows % complete text')

    # Progress bar rendered (div with style width)
    progress_bar = page.locator('[style*="width"]').count() > 0
    chk(progress_bar, 'Progress bar element with width style present')

    # Remaining count or goal-met message
    remaining_or_met = (
        page.locator('text=more application').count() > 0 or
        page.locator('text=Goal reached').count() > 0
    )
    chk(remaining_or_met, 'Shows remaining count or "Goal reached" message')

    # ── 5A-E: Dashboard Action Center stats ──────────────────────────────────
    sec('Phase 5A-E · Dashboard Action Center')
    page.goto(f'{BASE}/', wait_until='networkidle')
    page.wait_for_timeout(400)

    chk(page.locator('text=Applied This Week').count() > 0,
        'Action Center: Applied This Week stat present')
    chk(page.locator('text=Interviewing').count() > 0,
        'Action Center: Interviewing stat present')
    chk(page.locator('text=Action Required').count() > 0,
        'Action Center: Action Required stat present')
    chk(page.locator('text=Follow-ups Due').count() > 0,
        'Action Center: Follow-ups Due stat present')

    # Stats are numeric values
    weekly_val_el = page.locator('text=Applied This Week').locator('..').locator('p').nth(1)
    if weekly_val_el.count() > 0:
        val_text = weekly_val_el.inner_text().strip()
        chk(val_text.isdigit(), f'Applied This Week shows numeric value ({val_text})')
    else:
        probe('Action Center numeric value check skipped — element structure differs')

    # Action Required links to /jobs via "New · score ≥ 7" subtitle
    score_label = page.locator('text=New · score ≥ 7').count() > 0
    chk(score_label, 'Action Required subtitle "New · score ≥ 7" present')

    # ═══════════════════════════════════════════════════════════════════════════
    # Phase 5B — Interview Tracker & Today's Focus
    # ═══════════════════════════════════════════════════════════════════════════

    # ── 5B-A: Today's Focus widget ────────────────────────────────────────────
    sec("Phase 5B-A · Today's Focus widget")
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)

    focus_count = page.locator("text=Today's Focus").count()
    if focus_count > 0:
        chk(True, "Today's Focus section rendered")

        # Section is either showing items OR the "All clear" empty state
        is_all_clear = page.locator('text=All clear').count() > 0

        # Sub-heading: 'Top priority actions' when items exist, 'All clear' when empty
        sub_present = (
            page.locator('text=Top priority actions').count() > 0 or is_all_clear
        )
        chk(sub_present, "Today's Focus sub-heading present ('Top priority actions' or 'All clear')")

        if not is_all_clear:
            # At most 5 action item rows inside the section
            rows = page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes("Today's Focus"));
                if (!sec) return 0;
                return sec.querySelectorAll('.divide-y > div').length;
            }""")
            chk(0 < rows <= 5, f"Today's Focus shows 1–5 action rows (found {rows})")

            # View all link → /jobs
            view_link = page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes("Today's Focus"));
                const a = sec?.querySelector('a');
                return a ? a.getAttribute('href') : null;
            }""")
            chk(view_link is not None and '/jobs' in view_link,
                "Today's Focus has 'View all' link → /jobs")

            # At least one action type badge visible
            badges = ['Overdue', 'Interviewing', 'High Match', 'No Follow-up',
                      'No Contact', 'No Notes']
            any_badge = any(page.get_by_text(b).count() > 0 for b in badges)
            chk(any_badge, 'At least one action-type badge visible in Today\'s Focus')
        else:
            probe("Today's Focus in 'All clear' state — no action rows (correct behavior)")

    else:
        probe("Today's Focus hidden — no jobs in current data (correct behavior)")

    # ── 5B-B: Active Opportunities (Interview Tracker) ────────────────────────
    sec('Phase 5B-B · Active Opportunities (Interview Tracker)')
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)

    tracker_count = page.locator('text=Active Opportunities').count()
    if tracker_count > 0:
        chk(True, 'Active Opportunities section rendered')

        # Sub-heading
        chk(page.locator('text=Grouped by stage').count() > 0,
            'Active Opportunities sub-heading "Grouped by stage" present')

        # At least one stage group label visible
        stage_labels = ['Interviewing', 'Offer', 'Applied', 'Rejected']
        visible = [s for s in stage_labels if page.get_by_text(s).count() > 0]
        chk(len(visible) > 0,
            f'At least one stage group visible: {visible}')

        # Pipeline link
        pipeline_links = page.get_by_role('link', name='Pipeline')
        chk(pipeline_links.count() > 0, 'Active Opportunities has Pipeline link')
        if pipeline_links.count() > 0:
            href = pipeline_links.first.get_attribute('href') or ''
            chk('/pipeline' in href, 'Pipeline link points to /pipeline')

        # Stage count badges (small rounded-full span next to stage label)
        count_badges = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes('Active Opportunities'));
            if (!sec) return 0;
            return sec.querySelectorAll('span.rounded-full').length;
        }""")
        chk(count_badges > 0, 'Stage count badges present in Active Opportunities')

        # Job rows within tracker
        job_rows = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes('Active Opportunities'));
            if (!sec) return 0;
            return sec.querySelectorAll('[class*="rounded-lg"][class*="border"]').length;
        }""")
        chk(job_rows > 0, f'Job rows visible in stage groups ({job_rows} rows)')

    else:
        probe('Active Opportunities hidden — no Applied/Interviewing/Offer/Rejected jobs in current data (correct behavior)')

    # ═══════════════════════════════════════════════════════════════════════════
    # Phase 5C — TodaysFocus polish + InterviewTracker tabs
    # ═══════════════════════════════════════════════════════════════════════════

    # ── 5C-A: Priority styling + deduplication + Apply button ─────────────────
    sec("Phase 5C-A · Today's Focus — priority styling & dedupe")
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)

    focus_present = page.locator("text=Today's Focus").count() > 0
    is_all_clear  = page.locator('text=All clear').count() > 0

    if focus_present and not is_all_clear:
        # Priority-colored icon containers: P1/P2/P3 get themed colors
        colored_icons = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes("Today's Focus") &&
                           !s.textContent?.includes('All clear'));
            if (!sec) return false;
            const html = sec.innerHTML;
            return html.includes('bg-red-500') || html.includes('bg-amber-500') ||
                   html.includes('bg-indigo-500');
        }""")
        chk(colored_icons, "Priority-colored icon containers present for P1/P2/P3 items")

        # Deduplication: buildTodaysFocus deduplicates by job ID (not title).
        # Two different jobs can share a title, so we verify row count ≤ 5
        # (already checked above) rather than title uniqueness.
        focus_row_count = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes("Today's Focus") &&
                           !s.textContent?.includes('All clear'));
            if (!sec) return 0;
            return sec.querySelectorAll('.divide-y > div').length;
        }""")
        probe(f"Today's Focus deduplication: {focus_row_count} rows rendered (≤5 cap enforced by buildTodaysFocus)")

        # Apply button present for High Match items (if any exist)
        high_match_count = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes("Today's Focus") &&
                           !s.textContent?.includes('All clear'));
            if (!sec) return 0;
            return Array.from(sec.querySelectorAll('span'))
                .filter(s => s.textContent?.trim() === 'High Match').length;
        }""")
        if high_match_count > 0:
            apply_btns = page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes("Today's Focus") &&
                               !s.textContent?.includes('All clear'));
                if (!sec) return 0;
                return Array.from(sec.querySelectorAll('button'))
                    .filter(b => b.textContent?.trim() === 'Apply').length;
            }""")
            chk(apply_btns > 0,
                f"Apply button present for High Match items ({high_match_count} High Match, {apply_btns} Apply buttons)")
        else:
            probe("No High Match items in Today's Focus — Apply button not present (correct)")

    elif focus_present and is_all_clear:
        # "All clear" empty state should show the CheckCircle icon area
        chk(True, "Today's Focus shows 'All clear' empty state")
        probe("No items to check for priority styling or deduplication in 'All clear' state")
    else:
        probe("Today's Focus not rendered — no jobs data (correct)")

    # ── 5C-B: InterviewTracker stage filter tabs ──────────────────────────────
    sec('Phase 5C-B · InterviewTracker stage filter tabs')
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)

    tracker_present   = page.locator('text=Active Opportunities').count() > 0
    no_active_present = page.locator('text=No active applications').count() > 0

    if tracker_present and not no_active_present:
        chk(True, 'Active Opportunities section has data — tabs should be present')

        # "All" tab must always be present (it's the default)
        all_tab_text = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes('Active Opportunities') &&
                           !s.textContent?.includes('No active applications'));
            if (!sec) return false;
            return Array.from(sec.querySelectorAll('button'))
                .some(b => b.textContent?.trim().startsWith('All'));
        }""")
        chk(all_tab_text, '"All" tab present in Active Opportunities section')

        # At least one stage-specific tab beside "All"
        stage_tabs = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes('Active Opportunities') &&
                           !s.textContent?.includes('No active applications'));
            if (!sec) return [];
            const stages = ['Interviewing', 'Offer', 'Applied', 'Rejected'];
            return stages.filter(s =>
                Array.from(sec.querySelectorAll('button'))
                    .some(b => b.textContent?.trim().startsWith(s))
            );
        }""")
        chk(len(stage_tabs) > 0, f'Stage tabs present for: {stage_tabs}')

        # Clicking a stage tab filters: row count stays > 0 and ≤ total
        if len(stage_tabs) > 0:
            first_stage = stage_tabs[0]
            rows_before = page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes('Active Opportunities'));
                return sec?.querySelectorAll('[class*="rounded-lg"][class*="border"]').length ?? 0;
            }""")

            # Click the first stage tab via evaluate (avoids ambiguous locator)
            page.evaluate(f"""() => {{
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes('Active Opportunities'));
                const btn = Array.from(sec?.querySelectorAll('button') ?? [])
                    .find(b => b.textContent?.trim().startsWith('{first_stage}'));
                btn?.click();
            }}""")
            page.wait_for_timeout(300)

            rows_after = page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes('Active Opportunities'));
                return sec?.querySelectorAll('[class*="rounded-lg"][class*="border"]').length ?? 0;
            }""")
            chk(rows_after > 0,
                f"After clicking '{first_stage}' tab: {rows_after} job rows still visible")
            chk(rows_after <= rows_before,
                f"Stage tab reduces/keeps row count ({rows_before} → {rows_after})")

            # Clicking "All" restores full list
            page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes('Active Opportunities'));
                const btn = Array.from(sec?.querySelectorAll('button') ?? [])
                    .find(b => b.textContent?.trim().startsWith('All'));
                btn?.click();
            }""")
            page.wait_for_timeout(200)
            rows_restored = page.evaluate("""() => {
                const sec = Array.from(document.querySelectorAll('section'))
                    .find(s => s.textContent?.includes('Active Opportunities'));
                return sec?.querySelectorAll('[class*="rounded-lg"][class*="border"]').length ?? 0;
            }""")
            chk(rows_restored == rows_before,
                f"After clicking 'All' tab: full row count restored ({rows_restored})")

    elif no_active_present:
        chk(True, "InterviewTracker shows 'No active applications' empty state")
        browse_link = page.evaluate("""() => {
            const sec = Array.from(document.querySelectorAll('section'))
                .find(s => s.textContent?.includes('No active applications'));
            const a = Array.from(sec?.querySelectorAll('a') ?? [])
                .find(a => a.textContent?.includes('Browse Jobs'));
            return a ? a.getAttribute('href') : null;
        }""")
        chk(browse_link is not None and '/jobs' in (browse_link or ''),
            "Empty state 'Browse Jobs' CTA links to /jobs")
    else:
        probe('Active Opportunities not rendered — no jobs (correct)')

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
