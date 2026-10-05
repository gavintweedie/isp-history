# Advanced-review batch (Oct 2026)

Items the standard research pass (`researcher`, DeepSeek V4.1 Flash) or the advanced gate could not safely resolve on its own. Each needs a human/advanced-agent decision. Evidence paths/URLs inline.

## A. Ready to apply now (clean, existing nodes, dated evidence) — awaiting go-ahead

1. **crox-developments → accord-technologies** edge, **1 Jan 2008** (rename note 15 Sep 2008). Evidence: own site "Accord Technologies and Crox Development merge to form Accord|Crox. (1/1/08)"; later capture "Accord|Crox becomes simply 'Accord' (15/9/08)". Target entity: Accord Technologies Unit Trust (ABN 78 087 723 726, cancelled 1 Apr 2014).
   - `https://web.archive.org/web/20080621091510id_/http://www.crox.com.au/`
2. **teleron → esc-internet** edge, **Feb 2019**. Evidence: live press, "Adelaide ISP EscapeNet acquires Teleron's customer base" (techpartner.news, 11 Feb 2019); Teleron receivership 24 Jan 2019 (Worrells).
   - `https://www.techpartner.news/news/adelaide-isp-escapenet-acquires-telerons-customer-base-519053`
3. **planet-ozi → esc-internet** edge, **~Mar 2019**. Evidence: Planet Ozi creditors' voluntary liquidation 7 Feb 2019 (already in node); customers bought by EscapeNet ~Mar 2019 (EscapeNet login page welcomes Planet Ozi customers; ProductReview "no longer operating").
4. **intas → iinet**: mark transfer as unsourced/approximate (user report only). Firm event = Broadband Wireless Pty Ltd creditors' voluntary liquidation 11 Apr 2012 (already the node's death). No public iiNet announcement found.

## B. Structural / identity decisions for the advanced batch

1. **northcoast-internet = bad record.** northcoast.com.au was North Coast Software Technology (Port Macquarie), never an ISP; cited ABN is a Nambucca sole trader whose 'North Coast Internet' name dates from Oct 2017. Real regional ISP was **Mid North Coast Internet** — but `midcoast-internet` already exists (death Dec 2022, from the death-verification pass). Options: delete `northcoast-internet`, or repoint it to the correct midcoast entity (likely duplicate).
   - `https://web.archive.org/web/20000524203229id_/http://www.northcoast.com.au/`
2. **goldnet = three-company conflation.** (a) GoldNet Computer Services, Maryborough VIC (goldnet.com.au; domain to Origin Internet by Sep 2000). (b) Goldnet Internet Services, Kalgoorlie WA — merged Jul 1999 with Ludin + Goldfields-Esperance Internet into Emerge. (c) GoldNet Pty Ltd, WA carrier (ABN 42 127 052 493, active 14 Aug 2007, gold.net.au, alive 2026 offering carrier/transit). Current node mixes them; it also has **two-way edges with emerge-technologies**. Needs split/rename.
   - `https://web.archive.org/web/19991013041047id_/http://gold.net.au/` ; `https://abr.business.gov.au/ABN/View?abn=42127052493`
3. **lets-go**: node identity/birth wrong. letsgo.com.au was **LedaNet** (Cairns, 134→150a Sheridan St) 1999–Oct 2003; the Concept Networks 'Lets Go' discount brand only from ~Jul/Oct 2005. `ledanet` node already exists. Recommend: re-date lets-go birth to mid-2005, move the 1999 reference to a domain-history note.
   - `https://web.archive.org/web/19991129024135id_/http://letsgo.com.au/` ; `https://web.archive.org/web/20031017022327id_/http://www.letsgo.com.au/` ; `https://web.archive.org/web/20051027005021id_/http://www.letsgo.com.au/`
4. **subnet-internet-services (Phase-2 build error).** Phase 2 gave it `→eftel (by Aug 2006)`. But sub.net.au announced "Welcome to KeyPoint! … KeyPoint is born on 18th [Nov 2002]" and Labyrinth's Apr-2000 About page already lists SubNet among its takeovers. So SubNet's customer base went to **Labyrinth/KeyPoint** (c. 2000–Nov 2002), and the 2006 EFTel capture is KeyPoint's successor state, not a SubNet→EFTel edge. Correct the edge target (→keypoint) or merge into the keypoint lineage; reconcile with `keypoint` node (which already has keypoint→eftel late 2003).
   - `https://web.archive.org/web/20000413034840id_/http://www.labyrinth.net.au/aboutus/index.html` ; `https://web.archive.org/web/20021127003102id_/http://www.sub.net.au/`
5. **commnet → 'The Planet Internet'** (theplanet.net.au, Sydney; founded Jun 1997; later SIS Group Pty Ltd) — a **different entity** from the dataset's `planet` node (FlowCom subsidiary). Decide: create a node for The Planet / theplanet.net.au, or record as a note only.
   - `https://web.archive.org/web/20020603112002id_/http://www.commnet.net.au/` ; `https://web.archive.org/web/20080502054858id_/http://www.theplanet.net.au/contact.html`
6. **australia-broadband (+ Click & Motion) → esc-internet (Oct 2019)**: 'Australia Broadband' business name is held by ESCAPENET TRUST from 4 Oct 2019 (ABR). No `australia-broadband` node exists. Decide: create node(s) or record as an EscapeNet-side note.
7. **teleron node status**: node says `active`, but Teleron went into receivership 24 Jan 2019 and its customer base was sold Feb 2019. Verify whether a later/other entity is active, or flip to inactive + death Jan 2019.
8. **intas** (see A4) — same item from the structural angle: consider whether the `intas→iinet` edge should exist at all given no public announcement.

## C. Carried-over flags (from earlier passes, still open)

- 12 undatable deaths; 6 unresolved ACNs; goldnet/northcoast/lets-go (above); ~441 leaf-mining candidates (in progress); EscapeNet book brands partially resolved here.

## D. Leaf-mining wave (CDX pre-scan, 568 leaf domains; 76 candidates researched)

Method: local Wayback CDX pre-scan of every transition-less ISP domain -> 76 domains whose history showed an HTTP redirect to a different host; each verified by the standard research agent (DeepSeek V4.1 Flash) replaying the captures. Result: 17 edge proposals, 5 same-company consolidations, 51 no-edge, 2 unresolved, 1 new-node proposal.

### D1. Clean edge recommendations (replayed 302/301 evidence)

- **acepia -> eftel** — Jun 2004 (acquisition). Melbourne ISP Acepia was absorbed into Eftel (Datafast) by mid-2004; node already documents the acquisition but no transition edge exists.  
  `https://web.archive.org/web/20040608032359id_/http://www.acepia.net.au/`
- **ansonic -> eftel** — by May 2006 (acquisition). Warrnambool/Westvic ISP on ansonic.com.au was absorbed into Datafast (Eftel) by 2000 and finally 302s to w3.eftel.com from May 2006.  
  `https://web.archive.org/web/20060502010438id_/http://www.ansonic.com.au/`
- **blue-planet-internet -> eftel** — Feb 2005 (acquisition). Blue Planet's operating site was redirected into Eftel by 3 Feb 2005, consistent with an Eftel-orbit absorption.  
  `https://web.archive.org/web/20050203015915id_/http://www.bluep.com/`
- **gateway-internet -> ciphertel** — c. 2003 (acquisition). Gateway Internet's business was taken over by CipherTel (same ABN/trading name) around 2003 and the domain later 301s to ciphertel.com.  
  `https://web.archive.org/web/20141218140501id_/http://www.gateway.net.au/`
- **itconnect -> netspeed** — Apr 2008 (acquisition). ITConnect's domain redirected into NetSpeed by Apr 2008, matching the node's c.2007-08 acquisition.  
  `https://web.archive.org/web/20080403033559id_/http://www.itconnect.net.au/`
- **merlin-australia -> internode** — by Mar 2001 (acquisition). Merlin Australia was absorbed by Internode; merlin.net.au served Internode/on.net content from Mar 2001.  
  `https://web.archive.org/web/20010301153853id_/http://www.on.net/`
- **onedex -> concept-networks** — Apr 2006 (acquisition). Perth ISP Onedex redirected into Concept Networks (conceptual.net.au) from 28 Apr 2006.  
  `https://web.archive.org/web/20060428100346id_/http://www.onedex.com.au/`
- **pegasus-networks -> microplex** — 1996 (acquisition). Pegasus Networks was acquired by Microplex in 1996 (Microplex itself absorbed into OptusNet in 1998); record edge to Microplex.  
  `http://www.rogerclarke.com/II/OzIHist.html`
- **projectx -> eftel** — Aug 2006 (acquisition). ProjectX (KeyPoint Pty Ltd) migrated its customers to Eftel and the domain 302s to w3.eftel.com from Aug 2006.  
  `https://web.archive.org/web/20060504003736id_/http://www.projectx.com.au/`
- **terra-communications-sa -> camtech** — 19 Apr 1999 (acquisition). Genuine acquisition: Terra Communications (SA)'s customers were taken over by OzEmail Camtech on 19 Apr 1999.  
  `https://web.archive.org/web/20000818174955/http://terra.net.au/`

### D2. Structural / new-node decisions (for the batch)

- **grafton-internet -> Lismore Online** (2001, rename) — Same-operator/sub-brand relationship; edge type (rename vs acquisition) is ambiguous.
- **pintech -> iiNet** (by Sep 2009, acquisition) — Absorption date is approximate (last 200 Jul 2008, first lasting 301 to iiNet Sep 2009-2011) and an earlier transient 2001 redirect muddies the timeline.
- **qconnect-internet -> Veridas Telecom & Internet / Veridas Communications (VTI)** (2005, merger) — Acquirer differs from the brief's prescan target (lamp-internet); requires a new merger edge to veridas.
- **frontierisp -> Ai Tel Pty Ltd (aitel.net.au)** (by Sep 2009, rename) — New node proposed (Ai Tel); needs entity/ABN check and merge with FrontierISP records.
- **world-wire -> ISP Ltd (ausisp.com)** (c. Nov 2001, acquisition) — Redirect target ausisp.com is ISP Ltd, which Hotkey purchased c.Nov 2001; no explicit World Wire notice - confirm whether the edge target should be isp-ltd or hotkey, and that World Wire was acquired rather than merely handed over.
- **logic-world -> Fuzion Pty Ltd** (20 Oct 2003, acquisition) — Acquirer Fuzion Pty Ltd / fuzion.com.au has no dataset node - structural proposal to create one and wire logic-world -> fuzion.
- **extremedsl -> Generation IT** (by Sep 2009, rename) — Likely same-operator brand consolidation (shared Subiaco/Perth site, git.com.au backends), so acquisition-vs-rename needs a call; also generation-it node currently dates its death to 2006 but generationit.com.au was a live ISP into 2012 - conflict with an existing dataset record.
- **highlands-internet -> Oracle Telecom** (c. 2012 (by Jan 2013), acquisition) — Acquirer Oracle Telecom is not a dataset node; a new node is needed to attach the absorption edge.

### D3. Advanced-review flags (identity conflicts, record conflicts, thin evidence, still-alive doubts)

- **tdce** (unresolved) — Thin/single redirect evidence, possible BIT.net acquisition but domain shows unrelated later reuse.
- **iqnet** (unresolved) — Identity/state conflict: Perth IQNET Pty Ltd (ABN cancelled 08 Dec 2004) redirected to Townsville QLD wireless ISP 'IQ Connect'; decide genuine rename/new node vs unrelated domain reuse.

### D4. No-edge (51) and same-company consolidations (5)

No absorptions found: domain afterlife/parking (e.g. mountain-apple → apple.com; charon → US iFriends), name collisions (gsn-net = US NH ISP; north-power = NZ Northpower; namadgi = Sydney game-dev), same-brand domain moves (highstream, icenet, jettech, greentreefrog, jazmin), or ordinary death. Same-company consolidations (no edge needed): arafura-internet, atlantic-digital, cm-internet, diverse-services, fish-internet.

### D5. Coverage note

The redirect method only finds HTTP-level moves. 381 further leaves had no HTTP redirect (213 internal/webmail, 123 none, 45 no captures) — meta-refresh absorptions are invisible to CDX status codes and would need digest-diff mining (future pass).
