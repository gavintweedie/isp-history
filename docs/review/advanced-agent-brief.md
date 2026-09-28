# Advanced-agent review brief

Items deferred from the Sep-2026 research passes that need a second opinion or deeper review. Evidence for the ACN/ABN items is in this folder.

## 1. ACN/ABN candidates held back (94)

Full records (evidence URLs, confidence, misattribution notes): `docs/review/acn-held-candidates.json`. Report: `docs/review/acn-research-report.md`.

### 1a. Era-flagged (10) — candidate ACN registers well after the ISP died; decide successor-vs-different-company

- `att-easylink`
- `backchannel-net`
- `coastnet`
- `ipax-systems`
- `ipbox`
- `krytech`
- `norfolk-island-data-services`
- `on-ramp`
- `psinet-perth`
- `ultranet`

### 1b. Low confidence (59) — trading-name-only matches needing corroboration

- `123-internet`, `access-net-australia`, `access-one`, `att-easylink`, `axs-internet-services`, `backchannel-net`, `blaze-internet-services`, `ccsweb`, `cheetah-adsl`, `city-net-internet-services`, `coastnet`, `ctel`, `cyberlink-technologies`, `cynet-services`, `cyrus-technologies`, `digitech-internet`, `everyones-internet`, `ezconnect-broadband`, `flowernet`, `funnelweb-internet`, `gippsnet`, `gist-internet`, `global-internet-communications`, `grafton-internet`, `holodoc-oz`, `hyperoz`, `infinite-data`, `interconnect`, `internet-one`, `interworld`, `ipax-systems`, `jcorp`, `krytech`, `lets-go`, `magic-net`, `merlin-australia`, `mission-control-systems`, `mns`, `monkeynet`, `mort-bay-communications`, `myaccess`, `netlink-wa`, `netmagic`, `norfolk-island-data-services`, `nuclear-days-online`, `on-ramp`, `oz2000-internet`, `ozziehost`, `pinnacle-internet`, `pronet`, `pudney-internet`, `silver-telecom`, `streamnet2000`, `ultranet`, `upnaway`, `web-express`, `werple`, `yourhub`, `zebra-internet`

### 1c. Not found (33) — mostly pre-ABN micro-ISPs; likely genuinely unincorporated

- `adsl-4-you`, `ait-communications`, `bondi-internet-services`, `byron-network-services`, `cnet`, `computers-on-the-run`, `cybercrow`, `cyberlabs`, `cybernet-2000`, `cybernet-australia`, `desertnet`, `dynamic-bells-networld`, `extremedsl`, `hal9000`, `iap-direct`, `internet-academy`, `internet-depot`, `jatoga`, `modnet`, `netinfo`, `nettrek`, `networx`, `omen-internet`, `panorama`, `pintech`, `portal-net`, `quantum-access`, `savtek`, `swiftlink`, `swis`, `terra-communications-sa`, `wave-nz`, `world-link-gold-coast`

### 1d. Original three holds
- `krytech` (only a 2026 company), `rivnet` (2M Systems is SA/Riverland, ISP was Wagga NSW), `maxx-communications` (Access 4 U Pty Ltd candidate)

## 2. Same-company clusters — merge vs cross-reference decision (22)

Different nodes resolved to one legal entity. 5 are already rename-linked; 17 have no edge. Decide whether to merge into one entity with `names[]` rows, or just cross-reference. Clusters (ACN/ABN: members):

- ACN 073238178: lets-go, myaccess, netcall  [NO edge]
- ACN 083037772: tsn-communications, zebra-internet  [NO edge]
- ACN 090539432: australis-internet, blaze-internet-services  [NO edge]
- ACN 089048439: austarmetro, austarnet  [NO edge]
- ACN 000042295: n-cable, neighbourhood-cable  [NO edge]
- ACN 003233421: internet-plus, psinet-australia  [NO edge]
- ACN 081355722: apana-act, apana-brisbane, apana-hunter, apana-melbourne, apana-sa, apana-sydney, apana-wa, lemon-apana  [NO edge]
- ACN 088377860: cobweb-internet, northnet, technet-2000  [NO edge]
- ACN 097787892: big-river-internet, omcs  [NO edge]
- ACN 066981235: penrith-netcom, planet-netcomm  [NO edge]
- ACN 089552223: cynet-services, total-network-support  [NO edge]
- ACN 085213690: mira-networking, werple  [NO edge]
- ACN 068467667: dialix, justnet  [rename-linked]
- ACN 081165871: lexicon-internet-services, ozramp  [NO edge]
- ACN 092716188: internet-vision-technologies, mission-internet  [rename-linked]
- ACN 066482406: interworld, wantree  [rename-linked]
- ACN 072244592: box-apana, satech  [rename-linked]
- ABN 84723024730: everyones-internet, grafton-internet, lismore-online, nuclear-days-online  [NO edge]
- ABN 82439200203: free-net, premiumnet  [rename-linked]
- ABN 72924334435: ar-internet, cia-dsl  [NO edge]
- ABN 65501770865: backchannel-net, ipbox  [NO edge]
- ABN 71286296831: infinite-data, psinet-perth  [NO edge]

Notably: 8 APANA nodes (APANA Inc.), `internet-plus`+`psinet-australia` (Zircon Systems), `austarnet`+`austarmetro` (Austar United Broadband), `cobweb`+`northnet`+`technet-2000` (Chariot Ltd), `lets-go`+`myaccess`+`netcall` (Eftel — acquirer entity, brand predates it), `box-apana`+`satech`, and others.

## 3. Other open items

- `yless4u` — death recorded 2024 but brand still operates under CMVAS; status/death may need revisiting.
- `ntg -> nexon` transition year (2004 vs 2003) unverified.
- 7 transition edges remain intentionally ref-less (pre-ABN): cybonet, box-apana, lemon-apana, lets-go, lithoptix, elipsys, interact-technology-group.


## 4. by-only births + leaf mining (Sep 2026 pass, 258 researched)

Full records: `/tmp/bo_all.json`; summary `/tmp/bo_report.md`.

- **Birth upgrades, low confidence (35)** — need corroboration before applying: `access-communications`, `att-easylink`, `beyond-net`, `blaze-internet-services`, `bunbury-internet-service`, `creative-internet`, `cybernet-2000`, `easynet`, `escape-online-internet`, `ezconnect-broadband`, `fleet-broadband`, `flowernet`, `fx-network`, `generation-it`, `gist-internet`, `goulburn-valley-internet-services`, `infinite-data`, `interconnect`, `internet-express`, `internet-one`, `ipbox`, `mullumbimby-access-point`, `netinfo`, `octa4`, `on-ramp`, `online-information-systems`, `powerup`, `premiumnet`, `ruralnet`, `safetyweb`, `silver-telecom`, `snoopa-hervey-bay`, `space-net`, `westvic-internet`, `world-link-internet`
- **Absorption candidates needing a NEW node or slug mapping (~30)** — the acquirer is not an existing dataset node (or the slug needs resolving), e.g. `interworld->Wantree`, `satlink/ompac->Chariot Netconnect`, `webaxs/jade->Labyrinth`, `internet-plus->PSINet`, `australis-internet->Comcen`, `techex->Destra`, `harbourit->Canon`, `north-power->Country Energy`, `cyberspace-corporation->Montimedia`. Decide: create nodes vs record as notes.
- **Leaf-connection mining still open** — this pass covered the 167 leaf+by-only; ~441 remaining leaf nodes (born mostly 1990s-2000s) still need Whirlpool-news/redirect mining for hidden acquisitions.

## 5. Birth-date conflicts to adjudicate (10) — current value set by another contributor or a verification pass

Decide whether the proposal (with its new evidence) should override the existing referenced value:

- `best-telecom`: current 'by 2007' set by Lincoln Dale (2026-09-03) vs proposal 'by Sep 2007'
- `betem`: current 'by 2005' set by Lincoln Dale (2026-09-03) vs proposal 'c. 2004'
- `bfm-telecoms`: current 'by 2007' set by Lincoln Dale (2026-09-03) vs proposal 'c. 2006'
- `bigfoot-internet`: current 'by 2001' set by Lincoln Dale (2026-09-03) vs proposal 'by 10 May 2000'
- `brown-bear-internet`: current 'by 2005' set by Lincoln Dale (2026-09-03) vs proposal 'by Jun 2004'
- `bushcom`: current 'by 2005' set by Lincoln Dale (2026-09-03) vs proposal 'c. 2004'
- `connected-australia`: current 'by 2014' set by Lincoln Dale (2026-09-03) vs proposal '2015 (company says 'delivering ... since 2015')'
- `corporate-online`: current 'by 1997' set by Ian Henderson (2026-08-28) vs proposal 'by 1998 (site copyright)'
- `data-oz-solutions`: current 'by 2008' set by Lincoln Dale (2026-09-03) vs proposal 'by Jan 2007'
- `network-technology`: current 'Aug 1996' set by Ian Henderson (2026-08-29) vs proposal '1996 (founder profile)'
- `webace`: current 'by Mar 2000' set by Ian Henderson (2026-08-28) vs proposal 'by May 1998'
## 6. Absorption-edge review (38)

50 new absorption candidates were found; 13 are safe (corroborated + target resolves). The remaining 38 need: a decision on whether the redirect/mention is a real takeover, and often a NEW node or slug mapping (targets like Wantree, Chariot Netconnect, Labyrinth, Datafast, Comcen, LinearG, Destra, Canon, Country Energy, Montimedia). Full list: `docs/review/bo-report.md`.

## Method note (for all future agents)

When proposing a change to an existing value, compare not only against the current file but against its **git provenance** (`git log -S '"<current value>"' -- <file>`). The repo has multiple contributors (Gavin Tweedie, Ian Henderson, Lincoln Dale) plus verification passes; do not override a referenced/verified value on weaker evidence.

## 7. Vague-death pass (527 entities)

Full evidence: `docs/review/vd-research.json`; report `docs/review/vd-report.md`.
- 16 conflicts (current death set by a prior contributor/verification) and 21 cases where the ISP looks still-alive/undatable (current death event may need removing) need adjudication.
- 177 low-confidence proposed changes held.
- 222 high/medium changes are apply-ready.

## 8. Vague-transition dates (139)

Full evidence: `/tmp/vt_all.json` -> copied to `docs/review/vt-research.json`; report `docs/review/vt-report.md`.
- 92 high/medium apply-candidates (83 materially change the date).
- 47 low-confidence flagged (mostly terminus-only evidence, thin archives, or direction ambiguity).
