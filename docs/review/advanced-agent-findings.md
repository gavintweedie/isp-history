# Advanced-agent review — findings & recommendations (Sep 2026)

Status: **Phase 1 APPLIED; Phase 2 APPLIED** (2 merges done; 9 new nodes created; 18 edges incl. the 'safe four'; D-notes and 7 cross-reference pairs applied). Remaining flagged items: unresolved ACNs/transitions, goldnet/northcoast/lets-go records, ~441 un-mined leaves, 12 undatable deaths.

Sources: fresh verification fetches (Wayback CDX, ABR, live sites, archived press) + git provenance checks.
Rule applied throughout: higher-confidence or provenance-backed reference beats an unsourced value; a real override of a contributor-verified value is called out explicitly.

## A. Death conflicts (16 flagged) — verdicts

15 of 16 "conflicts" are actually corroborations: proposed and current values agree on year/mechanism; current (Ian Henderson-set) values stand, proposals merely add explanation/evidence. Recommended action: keep dates, attach the new evidence refs.

- Keep current, add refs: cyberwizards, hawknet, netstra (accept 'between 2 Jun and 2 Aug 2002' as tightened range), netway-internet (accept 'between 7 Jan and 5 Feb 2007'), northern-rivers-gateway, northnet, qld-net, technet-2000, ballarat-netconnect, bunbury-internet-service, odyssey-communications, ourworld-global-network.
- omcs: current 'c. 2009' ← accept proposed 'by May 2009 (redirected to nor.com.au)' (refinement, consistent).
- people-telecom: current 'c. 2008' ← accept 'Dec 2008 (acquired by M2)' (well-documented public deal).
- squirrel-internet: current '1 Aug 2003' stands; add '(acquired by Chariot Ltd)' detail + refs.
- **speedlink — REAL CONFLICT (recommend change, user to confirm override of contributor-set value)**: current death 'by Aug 2026 (domain no longer resolves)' vs evidence-based 'c. early 2007'. Ian's own details record "Acquired by Chariot Limited in FY2003-04". CDX verified: own content live to 10 Jan 2007, first 301 redirect 16 Mar 2007, redirects thereafter; domain DNS lapsed by Aug 2026. Project convention = last retail homepage ⇒ death **c. Mar 2007** (approx), details carry the full timeline. Current date_disp/facts preserved in details.

## B. Birth conflicts (10 flagged) — verdicts

Accept (refinement or stronger evidence), all verifiable:
- best-telecom: by 2007 → **by Sep 2007** (ABR trading-names registered Sep 2007; Lincoln's by-2007 preserved as bound).
- bfm-telecoms: by 2007 → **c. 2006** (ABR trading-name Aug 2006; site live early 2007).
- brown-bear-internet: by 2005 → **by Jun 2004** (ABR trading-name registration Jun 2004).
- bushcom: by 2005 → **c. 2004** (ACN 111 288 647 incorporation-era + Jan 2005 site).
- data-oz-solutions: by 2008 → **by Jan 2007** (ABR partnership trading-name Jan 2007).
- webace: by Mar 2000 → **by May 1998** — VERIFIED first-hand: 17 May 1998 Wayback capture shows Web Ace dial-up services, PO Box Canningvale WA (overrides Ian Henderson's value, but with primary evidence Ian missed).

Reject (existing value is better-grounded):
- corporate-online: keep **by 1997** — Ian's provenance is the 1997 APNIC IP subnet allocations (in details); proposal's ©-1998 footer is weaker.
- network-technology: keep **Aug 1996** (Ian, whois-argued) — proposal '1996' is looser.
- bigfoot-internet: keep **by 2001** — 10 May 2000 capture is "Bigfoot Media" (US entity's domain), not the AU ISP; Lincoln's verification already documented "earliest substantive capture 25 Sep 2001".

Hold (fence — leave flagged):
- betem (c. 2004 rests on a © 2004 footer only; keep by 2005 for now).
- connected-australia ('by 2014' = ABN existence vs 'since 2015' = service-start claim; convention decision needed).

## C. Same-company clusters (22) — adjudication

**Merge (recommend, user confirms since a node disappears):**
1. penrith-netcom → planet-netcomm: literal company rename (PENRITH NETCOM PTY LTD → PLANET NETCOM PTY. LIMITED, same ACN 066 981 235, same pnc.com.au domain, same Datafast acquisition death). Merge names[]: Penrith NetCom c.1996–by Jan 1997; Planet Netcomm → death 16 Feb 2004.
2. n-cable → neighbourhood-cable: ncable.net.au was the retail brand of Neighbourhood Cable Ltd (ACN 000 042 295); identical TransACT 2007/2011 timeline; Wikipedia corroborates. Merge names[]: Neighbourhood Cable (1996), "ncable" brand (~2000), death 2011.

**Keep separate, ADD cross-reference sentences to summaries (currently missing):**
- tsn-communications ↔ zebra-internet (Saunders family, Port Macquarie — sister brands)
- mira-networking ↔ werple (pending verification — possible werple→mira takeover edge)
- big-river-internet ↔ omcs (Linear G group)
- everyones-internet ↔ grafton-internet ↔ lismore-online ↔ nuclear-days-online (one Lismore sole trader's four brands)
- backchannel-net ↔ ipbox (Darren Worley sole trader, both sold to IDEAL)
- infinite-data ↔ psinet-perth (see §G — likely same trust/entity, possible third merge pending evidence)
- cobweb-internet ↔ northnet ↔ technet-2000 (all Chariot Ltd ACN — acquirer stamp only)

**Already rename-linked / edged — keep separate (established rename-chain pattern):** dialix/justnet, internet-vision-technologies/mission-internet, interworld/wantree, box-apana/satech, free-net/premiumnet.

**Metadata fix:** internet-plus → zircon-systems edge type is 'rename' but factual relationship is division/absorption — recommend type 'acquisition'.

**APANA 8-region cluster:** keep separate (regional chapters of one incorporated association — model org, note exception).

## D. Open items (brief §3)

- **yless4u** — RESOLVED: brand operates today (live site, current legal policies, network status, splynx portal; verified Sep 2026) under CMVAS. The yless4u→cmvas acquisition edge already notes "brand continues operating". Fix: status → active, remove the 2024 death event, note acquisition in summary.
- **ntg→nexon (2004 vs 2003)** — RESOLVED: archived iTnews article (URL id 20797, live version 404s) "Nexon buys customers from troubled NTG", Fleur Doidge, 6 Dec 2004 (Alcatel/voice contracts). Current edge (6 Dec 2004 + dual-note re Nexon's own 2003 timeline) is correct and honest; close the item.
- **commander** — corroborated as-is (2008 administration; M2 bought SME/telco 2009), per Lincoln's verified record. No change.
- **7 ref-less edges:** cybonet→internet-depot now sourceable — homepage notice "Cybonet is now merging with Internet Depot… effective 31 January 2001" (Wayback 1 Feb 2001) ⇒ date 31 Jan 2001 + ref. box-apana→satech / lemon-apana→satech: SATECH deregistered, no surviving incorporation record page; APANA oral-history only ⇒ keep ref-less (documented). elipsys→vine-networks: elipsys.com.au is a static stub 2018-2022 (CDX), no notice ⇒ keep ref-less (unverifiable). lithoptix→veridas: no source found ⇒ keep ref-less. lets-go→concept-networks and interact→velocity-holdings: pending verification batch results.

## E. Still-alive review (21 flagged)

Verification (live sites + active ABNs, Sep 2026): **14 verdicts still-active, 7 dead-as-ISP, 0 unresolved.**

Recommend status→active + remove death event (12):
ethertech-online, hyperwave (BCD Networks Pty Ltd active ABN), internet-information-group (active partnership ABN, ©2026 site, NBN plans), lizzy-internet, matilda-internet, netbay-internet, overflow-internet (live regional DSL; churn note Dec 2025), rbe-internet, soft-tech-information (brand persists — caveat: now operated by IntPay Pty Ltd, not original entity; note it), velocity-internet (brand operates under ByteCard Pty Ltd, Mawson ACT; the c.2010 'merger into Velocity Holdings' death was wrong for the brand — note it), voipex, yourhub.

Recommend keep death — dead as ISP, per convention: entity may still live doing something else, but for timeline purposes the ISP is dead; details note the survival:
central-data-systems (company trades on as IT/cloud consultancy in West Perth; ISP arm gone ~2010), informed-technology (ABN cancelled 15 Jun 2010), integral-internet (placeholder since Oct 2009; Integral Development Pty Ltd continues non-ISP), ite-pro (managed IT only now), izip (domain now a computer-support business), jemisp (company relic sells computers/hosting only — no internet access for ~20 years), jigsaw-technology (domain repurposed to software consultancy), patash-internet (Patash Pty Ltd survives as hosting/DNS/mail provider — no retail internet access: dead as ISP c. 2000 stands).

Change date:
- ozisp: c.2004 → **Sep 2017** — archived service announcement "Withdrawal of Internet Services 28/09/2017" on ozisp.com.au (owner Uniware pivoted to managed IT — note survival).

Convention recorded from user direction: if dead as an ISP the entity is declared dead for timeline purposes; surviving non-ISP business is noted, not extended.

## F. Era-flagged / original ACN holds (13) — verdicts

ACCEPT (record entity):
- backchannel-net: sole trader Darren Christopher Worley, ABN 65 501 770 865 (trading name held since 26 May 2000).
- ipbox: same Worley ABN ('IPBOX' trading name from 26 May 2000).
- on-ramp: Onramp Computer Services → company ACN 134 122 151 (2008, West Perth; same business incorporated late, continuous branding 1996–2019).
- psinet-perth: PSINET UNIT TRUST (May 2000–Feb 2001), traded as INFINITE DATA until 16 Nov 2001, ABN 71 286 296 831 — ALSO resolves infinite-data: **same trust** ⇒ new merge candidate infinite-data ↔ psinet-perth.
- maxx-communications: site's own 2008 signup form prints 'ABN 84 112 175 390, PO Box 20 Watsonia' = ACCESS 4 U PTY LTD (ACN 112 175 390; holds Hyper-Drive name; hyp.net.au 'Hyperdrive is now Maxxcomm').
- krytech: site's 2006 contact page prints 'ABN 21 680 115 485' = sole trader KRYLYSZYN, RYAN JOHN (active Apr 2001, Elanora QLD) — correct operator recorded.

REJECT (candidate is a different/later company — record nothing):
- att-easylink (2008 EASYLINK SERVICES AUSTRALIA, no continuity), coastnet (2005 QLD company postdates the Nambour ISP), ipax-systems (2014 building consultants), ultranet (2012 Gold Coast shell), rivnet (2M Systems is a 2026 Riverland SA business; NSW ISP's operator unidentified).

UNRESOLVED:
- norfolk-island-data-services: operation's own site publishes NIDS Pty Limited ABN 53 843 802 983 (NI entity, est. 1987) — record that as operator; the 2015 exact-name AU company stays undetermined.

## G. New merge candidates (from ACN work) — REVISED

- werple ↔ mira-networking: RESOLVED — werple.net.au's own 1996–97 pages are branded 'Mira Networking Pty Ltd, Melbourne' ⇒ werple = Mira's brand; add edge werple→mira-networking and note the dataset's 'Perth WA ISP' label conflicts with the domain's own record (Mira operated the POPs; brand Melbourne-based).
- infinite-data ↔ psinet-perth: NO clean merge. S4: trust named PSINET UNIT TRUST traded as INFINITE DATA until 16 Nov 2001. S6: both 'Infinite Data' ABR registrations postdate iiNet's acquisition. Assembled story: Mark Siena's Perth company (PSInet Perth, 1992) sold ISP ops to iiNet (c.1999–Feb 2000); the remaining entity traded as Infinite Data (2000–01) then Digital Ventures. The two dataset nodes cover the pre/post-sale phases. Recommend: keep separate, cross-reference in both summaries, no merge. (Evidence stored; murky enough to leave flagged.)

## H. Data bugs found during review

- transitions.json: goldweb-internet→velocity-internet recorded TWICE (duplicate acquisition edges, same 10 Apr 2006 date, different notes/refs) — merge into one edge. (uniti→cmvas and spirit→maret splits and iinet→e-wire two-region edges are intentional two-arm records, leave.)

## Pending verification batches (background, will extend this file)

- §I: 47 low-confidence transition dates — DONE (see below)
- §J: 38 absorption-edge proposals — DONE (see below)
- §K: 35 low-confidence birth refinements — DONE (see below)
- §L: 51 low-confidence ACN matches — DONE (see below)

## K. Low-confidence birth refinements (35) — 14 promote, 18 confirmed-current, 3 unresolved

**Promote (all first-party/direct sources):**
- bunbury-internet-service → **17 Aug 1995** (exact — own homepage: 'officially opened to the public on Monday 17th August 1995')
- att-easylink → **by Nov 1992** (AFR 24 Nov 1992: AT&T/Paxus/Qantek JV announcement)
- interconnect → **by Mar 1994** (Zik Saleeba March-1994 Network Access FAQ lists InterConnect Australia)
- internet-express → **by Nov 1996** (ix.net.au capture 7 Nov 1996; drops the unsupported c. 1995)
- escape-online-internet → **by Jul 1997** (Cynosure listing 5 Jul 1997)
- generation-it → **by Jul 1997** (Cynosure + git.com.au footer 20/7/97)
- safetyweb → **Sep 1996** (own homepage: 'formed in September 1996 by Jimi Bostock')
- octa4 → **c. Jan 1995** (founder profile: MD Octa4 Pty Ltd Jan 1995–2005)
- online-information-systems → **c. Mar 1993** (ACN 059 612 609 registered 30 Mar 1993, ASIC mirror)
- fleet-broadband → **by Apr 2001** (ABR: entity + trading name from 20 Apr 2001)
- fx-network → **c. May 2003** (KPMG adviser report 'May 2003 – Company Established' + director's own talk; register mirror incorporated 11 Aug 2003) — supersedes a by-Nov-2002 guess
- premiumnet → **by Oct 2002** (ABN 82 439 200 203 'PremiumNet Internet Services' active 14 Oct 2002 — trading name predates the free.net.au rename of Mar 2004; no conflict)
- silver-telecom → **by Nov 2002** (silverconnect.com.au captured 27 Nov 2002; same operator as silvertelecom per PeeringDB)
- snoopa-hervey-bay → **c. Feb 2003** (Snooper Systems Pty Ltd ACN 103 690 526 incorporated 11 Feb 2003; note ABR shows NSW)

**Confirmed-current (18):** beyond-net (24 Feb 1998 stands), blaze-internet-services (keep distinct from Melbourne BlazeNet 1997), creative-internet, cybernet-2000, easynet (Mackay company inc. 3 Jun 1998), ezconnect-broadband, flowernet, gist-internet (© 1996), goulburn-valley-internet-services (note: gvis.net.au became 'Dieselnet' by Jan 1999 — possible rename/edge lead), infinite-data (by-Oct-1998 unverified but harmless as bound), ipbox, mullumbimby-access-point, netinfo (Canberra, by Dec 1996 capture), on-ramp, powerup (founder: BBS since ~1988, ISP mid-90s), ruralnet (© 1996 sister domain), westvic-internet, world-link-internet.

**Unresolved (3) — with data bugs to fix regardless:**
- space-net: 'by 1994' is UNSUPPORTED — WA space.net provable only by 1997 (Cynosure Apr 1997, Wayback Dec 1997), and 1994 likely borrowed from Munich's SpaceNet (founded Dec 1993, name collision). Recommend: birth → 'by 1997' with Cynosure ref.
- internet-one: current details claim 'Earliest Wayback capture (isone.com.au)' — FALSE (first capture is 2021). Only hard bound: acquired by IDEAL Internet end-1999. Recommend: birth → 'by 1999', strip the false claim.
- access-communications: the ACN 068 763 609 stamped by the legal-entity pass is checksum-INVALID and no 'Access Communications (WA) Pty Ltd' surfaces in ABE Lookup — the claim looks fabricated; 'by Mar 1995' unsupported (provable by Apr 1997, Cynosure). Recommend: REMOVE the ACN, birth → 'by 1997'.

## I. Low-confidence transition dates (47) — 28 promote, 5 confirmed-current, 14 unresolved

**Promote (all claims replayed against Wayback captures; dated press/ABR/ASX):**
- ruralnet→macarthurcook **FY1999–2000** (Local Telecom ASX prelim report 13 Sep 2000: 'Purchase of Ruralnet Business $550k in shares')
- rocknet→iinet **H1 2002** (Malone quote + meta-refresh by 21 Nov 2002)
- hartingdale→iinet **mid-2002** (own site 4 Jun → 302 to iinet 20 Jul 2002)
- lets-go→concept-networks **mid-2005** — important correction: the 'c. 2001' brand claim was wrong; discount brand 'coming soon' Jul 2005, 'Part of the Concept Group' by Feb 2006
- firestar→concept-networks **mid-2005** (operator flip FireSTAR Internet Pty Ltd → Conceptual Internet Australia, Apr–Jun 2005 ABR)
- swisp→westnet **c. 2001**; treko-internet→westnet **May–Jul 2001**
- powerup→ozemail **Mar 2000** (AFR 31 Mar 2000: OzEmail to 100%, 55% stake since c.1998)
- **CORRECTION** — cybanet-internet-services→eftel: 'by Jul 2008' (applied f4452d4) → **Aug 2006** (own site 4 Aug → 302 to eftel.com 19 Aug 2006 on the .net.au; .com.au capture gap had masked it)
- eepo→ausconnect **by late 2001** (ausconnect contact on homepage Sep 2001)
- ocean-broadband→red-broadband **by Jan 2016** (first-party acquisition notice)
- interconnect→connect-com-au **by Dec 1996** (own page: 'now supported as a direct product of connect.com.au')
- ballarat-netconnect→chariot **1999** (ABR names under Chariot 29/30 Dec 1999 + founder quote) — TENSION with node death 'c. 2004 (principals joined Chariot)': recommend edge 1999 (ownership move) + keep brand-death c. 2004, document both
- magnadata→ntt-australia **31 Jan 2002** (chain dated: Davnet bought Magna Data Feb 1999; NTT completed Davtel takeover + rename 31 Jan 2002)
- useoz→hotkey **2 Dec 2002** (SMH: Primus subsidiary acquires three ISPs ex-administration)
- geko-internet→hotkey **by 31 May 2003**; instant-communications→eftel **by 5 Dec 2006** (own redirect notice); crystal-internet-services→eftel **c. 2011** (own AIP/Perth site to Dec 2010, Eftel-branded Jan 2012)
- **interact-technology-group→velocity-holdings: brief's c. 2018-19 is WRONG** — InterACT content Sep 2004 → meta-refresh to velocity.net.au by 2 May 2006 ⇒ **c. 2005–06**
- spirit-networks→asia-online **c. 2000** (founder's own profile: trade-sale to Asia Online 2000)
- **netspeed→velocity-internet: 'by Jan 2024' (applied d55e70f) is WRONG** — retail site live 17 Sep 2024, webmail-only by 15 Oct 2024 ⇒ **between 17 Sep and 15 Oct 2024**; also fix the netspeed death applied in the same batch. Severity-flag: the 173-batch made this error.
- intas→iinet: user's 'late Feb 2012' unverified — redirects were INTERNAL through Oct 2012; →webmail.iinet.net.au from 21 May 2013 ⇒ record deal as unverified-2012 report + **iiNet-branded redirect by May 2013**
- qld-net→chariot, technet-2000→chariot, mackay-internet→chariot: **by 25 Mar 2005** (Chariot QLD portal); technet ABR name retired 21 Sep 2004
- bunbury-internet-service→ciphertel **4 Sep 2008** (APNIC rereg of the 1997 Bunbury block)
- dynamite-internet→eisa-limited, topend-com-au→eisa-limited: **by 17 Apr 2000** (ABR EISA name registrations)

**Confirmed-current (stand as-is):** tassienet→macarthurcook (by late 2002), acay→ventraip (by Dec 2013; note Acay absent from VentraIP's official acquisition list), emerge-technologies→goldnet (c. 2013), karratha-internet→planet-ozi (by Apr 2013), silver-telecom→anittel (c. late 2009–10 — now STRENGTHENED: joint 'Officelink Plus & Silver Telecom' business name from 1 Nov 2008 + Hostech/Anittel bought OfficeLink end-2009; combines with §J's silverconnect rebrand note).

**Stay unresolved (14):** nella-networks→beretvale (Whirlpool hints later Bordernet absorption — new lead), crox-developments→anittel, viper-internet→ideal-internet (viper.net.au traded to 2008 — story muddy), healey-communications→ideal-internet (IDEAL page doesn't name Healey), box-apana→satech, lemon-apana→satech, apana-act/wa/hunter/sa→apana (node formations), blazenet→hotkey, giganet→hotkey, ourworld-global-network→auslink, austarmetro→virtual-communities (own brand to Aug 2004; first 301 Dec 2004).

## J. Absorption-edge review (38) — verdicts

**34 verified as takeovers. Apply plan:**
- Edges to EXISTING nodes (apply directly): harboursat→harbour-isp; widelinx→amcom; oz-internet-services→veridas; dinkum-internet→ispone; v-app→eftel; alias-internet→tribal-technology; planet-netcomm→eftel (Datafast absorbed); network-technology→eftel (Datafast); interworld→wantree; internet-plus→psinet-australia; big-river-internet→linear-g (Dec 2018); geko-internet→hotkey; ompac-internet→chariot (2006); satlink→chariot (2006); topend-com-au→austarnet (see fence below); one-earth-internet→ihug (see fence); pbba→commander (parent iBurst wind-down 2008 — details-only, no buyer edge change).
- New ISP nodes WORTH creating (then attach edge): key-internet (Coffs Harbour; brown-bear-internet→key-internet 2011, one-net→key-internet 2012; Key Internet business name to Jazi Group Apr 2018); jazi-group (JAZI GROUP PTY LTD, WA 6090, ABN active from 16 Jul 2013; a DIFFERENT company from the 1990s JAZINET partnership — jazinet's 2009 death stands, jazi.net domain-afterlife noted; break-free→jazi-group 2019; aggregator: business names JaziNET/Key Internet/Maxnet/Hot Internet/Nitro/D2/Argo/Conxx); eezi-net (Perth; netmagic→eezi-net 2007; →eftel Sep 2009); subnet-internet-services (Melbourne; cynet-services→subnet Jan 1999 per Lincoln note; →eftel Aug 2006; NOTE keypoint node's 'by 2000 Labyrinth took over …SubNet' line needs reconciliation — verify before writing); securetelecom (iexec→securetelecom 2006, iTnews May 2006; later Brennan IT 2009); aussielinx (Aussie Dial Pty Ltd, Blakehurst; aussie-isp→aussielinx 2014); montimedia (Ballarat retail ISP; cyberspace-corporation→montimedia, earliest redirect Jan 2011); msi-managed-solutions-internet (Brisbane; digital-connect-communications→msi 2008).
- Record on node only, NO edge (acquirer not ISP-type / scope): harbourit→acquired by Canon Australia (IT services, staged 2014–17); north-power-communications→parent merged into Country Energy 2001.
- Fence: iqnet→IQconnect ('possibly internal pivot' — verify entity relation first; rename vs takeover); voice2net chain (futureweb→voice2net 2015 verified; onward Q Telecom 2015 → Powercom Pacific 2021 → more.com.au 2023 — create voice2net node with note chain or leave as note: recommend node since 2 hops carry evidence).

**4 refuted — no edge, fix node notes to say domain-afterlife/reuse:**
- airnet→Digital247 (domain afterlife of an ISP dead ~2001; Digital247 is a design shop)
- direct-net-solutions→TheDC (domain reuse by Brisbane cloud firm; original died 2007)
- australis-internet→Comcen (the 2010 ZDNet deal was 'Internet Australis' of Victoria — name collision; THIS node's australis.net showed Locall Pty Ltd in 2010)
- techex→Destra is a RENAME of Techex Communications (same ACN), not a third-party acquisition: keep 6 Oct 2004 Destra Corp acquisition record, add 'company renamed Destra Communications; techex.com.au folded Dec 2005'. No destra node.

**Node-level conflicts surfaced (for adjudication):**
- one-earth-internet: BOTH stories primary-sourced — own page Oct 2000 'One Earth has merged with … ihug' AND Ian's Chariot 2004 Annual Report Note 35 (1 Jan 2004, ~500 customers). Reconciliation: merged into ihug Oct 2000; Chariot acquired the remaining One Earth base (from the ihug estate post-iiNet) 1 Jan 2004. Recommend: add one-earth→ihug merger edge (Oct 2000) + keep Chariot death with clarifying details.
- topend-com-au: no real conflict — ABR 'EISA TOPEND' names (Apr 2000) AND archived page 'A division of Austar Entertainment' (© 2000) are both true across the Austar-bought-EISA chain. Keep Edge/Eisa record, add Austar-division note.
- silver-telecom: silverconnect.com.au = own rebrand (2009; still 'Silver Telecom' branded Oct 2009; domain afterlife to invanuatu.net by 2024). The silver-telecom→anittel edge (c. 2010, previously flagged low) is now MORE suspect — recommend noting the rebrand, keep flagged/unresolved.
- break-free/jazinet: confirmed Jazi Group Pty Ltd (2013 company) ≠ original JAZINET partnership — do NOT let break-free→jazinet connect; use new jazi-group node.

## M. ACN not-found, second search (33) — DONE

**FOUND (accept — all from the ISPs' own archived pages):**
- cybercrow: APCC PTY. LTD., ACN 008 103 419 / ABN 14 008 103 419 (APCC pages hosted on cybercrow.net.au, same Stirling SA address).
- world-link-gold-coast: S M K MARKETING PTY. LTD., ACN 006 933 704 / ABN 79 006 933 704 (own 1997 T&Cs; printed "066" is a typo, ABR confirms 006).
- dynamic-bells-networld: Universal Dynamics ACN 064 416 673 t/a Dynamic Bell (own 1997 company profile; pre-ABN demise, no ABN).
- terra-communications-sa: TERRA COMMUNICATIONS (SA) PTY LTD ACN 079 861 242 (reg 26 Aug 1997, dereg 10 Sep 2001; own footer + CreditorWatch + Camtech transition page — corroborates existing camtech edge).
- adsl-4-you: FENCE — about page rebadges Bayside Internet content, but BAYSIDE INTERNET PTY LTD's ABN was cancelled 1 Jul 2001 while the 2004 adsl-4-you site footer reads "Female Technologies — owned and operated by a transgender person" (= Scafe partnership). Bayside's ACN does NOT belong on adsl-4-you's 2004 operation. Record: operated by Female Technologies (Scafe partnership) c.2004, content rebadged from Bayside Internet; verify the Scafe ABN (98 510 913 241) before stamping.

**SOLE-TRADER-LIKELY (record operator names in details; no ACN):**
- modnet (Mark Garland, Geraldton WA), internet-academy (Steve Goodridge, SAIA), hal9000 (Mike Bruins, Adelaide), byron-network-services (John Lindsay), savtek (Eugene Savva), swis (Paul Rolfe & Jurgen Steinert partnership, Bunbury — 2003 capture even links "parent company EFTel", corroborating swis→eftel).
- jatoga: record operator "Jarrod Friedland t/a JATOGA Online" (his own words). Do NOT stamp his ZENWEB-named ABN 97 641 180 034 — JATOGA never listed on it.
- nettrek: Graham & Marisa O'Dell (Fremantle's first internet cafe/ISP).

**NOT-FOUND (20, genuinely no entity — keep as-is):** extremedsl, internet-depot, bondi-internet-services, cybernet-2000, pintech, cnet, ait-communications, panorama, quantum-access, computers-on-the-run, cybernet-australia, portal-net, wave-nz, cyberlabs, swiftlink, networx, iap-direct, omen-internet, netinfo, desertnet.

**Bonus facts:** AFR 30 Nov 1999 ("iiNet makes key purchases in WA; would buy Omen Internet and Net Trek Online") tightens nettrek→iinet and omen-internet→iinet edges from '1999' to **Nov 1999** with a source.

## Intentionally NOT re-researched this pass

- 177 low-confidence vague-death proposals: honest prior verdict was low-confidence; recommend a dedicated future pass (live-ABN cross-check would be a cheap first filter) rather than churning.
- ~441 un-mined leaf nodes: a research program of its own.

## L. Low-confidence ACN matches (51) — 33 accept, 3 find-correct, 9 reject, 6 unresolved

**Accept (33), strongest class first:**
- Own-page-printed ABN/ACN: zebra-internet ('ABN 97 083 037 772' on contacts page), axs-internet-services ('AXS Systems ABN 48 006 904 847'), jcorp (© JCORP PTY LTD + whois ACN 009 063 076), lets-go (prints EFTEL LIMITED ABN 47 073 238 178 — final operator), myaccess ('part of the EFTel Group', Dec 2005 own page), gippsnet (McCracken partnership, exact postcode), mort-bay-communications (ACN 094 657 271), cynet-services (own page names TNS sister, ACN 089 552 223), holodoc-oz (own Aug 2000 notice names Amaze, ACN 075 832 281), mission-control-systems (own 1997-98 footers, pre-ABN), pronet (pre-ABN; liquidated Jul 1998), gist-internet (own about page; no ABN ever), interworld (own Dec 1996 page Wantree-branded), access-one ('wholly owned subsidiary of OzEmail Ltd' + ACN 070 546 977), werple (own pages = Mira Networking — see §G).
- whois-attributed: monkeynet (ABN 80 432 738 364), pudney-internet (registrant ABN 70 179 881 818), funnelweb-internet (registrant id = True North ACN).
- Name+era+location chains: everyones-internet / nuclear-days-online / grafton-internet (Sauer ABN 84 723 024 730), yourhub (King partnership), ozziehost (Willis, exact trading name 2005–08), netmagic (Lehne JV), streamnet2000 (ACN 102 801 883, exact era), silver-telecom (SILVER TELECOM PTY LTD QLD ACN 110 105 667 — corrects the 'Sydney' framing), city-net-internet-services (Citypak, exact era Perth), oz2000-internet (ACN 067 710 730), netlink-wa (ACN 055 311 110), pinnacle-internet (Triple i, ACN 095 209 671), web-express (own sale notice → ACN 105 458 605), cheetah-adsl (weak), merlin-australia (strong caveat). Full rows: /tmp/adv/result_acnlow.json.

**Find-correct (3):**
- access-net-australia → ACCESS NET PTY. LTD. ACN 068 112 176 (whois registrant).
- cyberlink-technologies → CCS Unit Trust t/a CYBERlink Computing Services (QLD), ABN 94 763 190 687 (the NSW Cyber Networks candidate rejected — starts at the ISP's death).
- interconnect → keep 'InterConnect Australia' for origins; Dec 1996 own page names connect.com.au Pty Ltd (post-absorption; covered by §I edge fix).

**Reject (record nothing):** hyperoz, ccsweb, digitech-internet, flowernet (ALSO flag: 'operator was Hawkins Nursery', ISP-ness weak — possible scope question), ctel, global-internet-communications, magic-net, mns, internet-one (see §K bug).

**Unresolved (6 — stay flagged):** 123-internet, ezconnect-broadband, blaze-internet-services, upnaway, cyrus-technologies, infinite-data (§G).

## Consolidated action plan (nothing applied yet — awaiting approval)

Phase 1 (safe, no deletions):
1. Add evidence refs to the 15 corroborated death-conflict records (dates unchanged) + the 8 dead-as-ISP notes.
2. Births: apply 6 accepted conflict refinements + 14 promoted births + the 3 bug fixes (space-net, internet-one, access-communications ACN removal).
3. Deaths: ozisp → Sep 2017; 12 still-active status fixes (remove death events, note acquisitions where edges exist).
4. Transitions: apply 28 promoted dates incl. the two corrections (cybanet Aug 2006; netspeed + interact fixes); confirm-current notes for 5; fix cybonet→internet-depot (31 Jan 2001 + notice ref); tighten nettrek/omen→iinet to Nov 1999 (AFR).
5. ACN/ABN stamping: 6 era/original accepts + 5 not-found-pass finds + 3 find-correct + 33 accepts (own-page/whois/trading-name classes; apply per-record evidence refs). Cheetah-adsl and merlin-australia are caveated — apply with note or hold.
6. yless4u status fix; speedlink death → c. Mar 2007 (flagged as contributor-override).
7. Fix duplicate goldweb→velocity-internet edge; internet-plus→zircon-systems type → acquisition.

Phase 2 (structural — need user's explicit call):
8. Merges: penrith-netcom→planet-netcomm; n-cable→neighbourhood-cable.
9. New nodes: key-internet, jazi-group, eezi-net, subnet-internet-services, securetelecom, aussielinx, montimedia, msi-managed-solutions-internet (+ maybe voice2net) with their edges; node-only notes for Canon/Country Energy absorptions.
10. Cross-reference sentences for the 7 cluster pairs lacking them; APANA exception note.

Left flagged for further review (no guessing): betem, connected-australia (birth); patash nuance (resolved as dead-as-ISP); adsl-4-you entity; 14 unresolved transitions (incl. 4 APANA formation edges); 6 unresolved ACNs; one-earth Chariot/ihug reconciliation detail; ~177 low deaths + ~441 un-mined leaves (future dedicated passes).

## N. Low-confidence vague-death verification (204) — APPLIED

Re-verified all held low-confidence deaths with replayed evidence (Wayback captures opened, ABR/ASIC, press). Verdicts: 82 promote, 75 adjust, 35 keep-current, 12 unresolved.
- 157 death dates applied/changed with evidence refs; 35 confirmed values gained refs only.
- Resurrected (verified by direct live-site checks): tech-info, esc-internet, norfolk-island-data-services.
- Kept dead: total-network-support (survival claim unreproducible), gtbnet (operator VoIP-only, noted), zebra-internet (unrelated 2024 revival, noted).
- Headline corrections incl. hotkey 2004->c. 2019; midcoast-internet 2000->Dec 2022; netline 2024->2004; exact: planet-ozi 7 Feb 2019, elders 1 Aug 2008, compuserve-pacific 31 Aug 2007, ourworld-global-network 1 Jun 1998, hb-australasia 18 Nov 2002.
- New edge leads recorded for later: crox->Accord (Jan 2008), commnet->The Planet Internet (Jun 2002), officelink-plus->BigAir (Oct 2016), ram-network-services->IntraPower (Mar 2008), reachnet->IPSTAR rebrand (2023), is-1->MyISP, hc-internet->HugoNet; EscapeNet's login welcomes Teleron/Planet Ozi/Click & Motion/Australia Broadband books.
- Still flagged: 12 unresolved deaths; goldnet record tangle (ISP vs carrier share ACN 127 052 493); northcoast-internet possible bad record; lets-go dual history.
