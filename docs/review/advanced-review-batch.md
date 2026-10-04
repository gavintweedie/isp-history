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
