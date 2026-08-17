/* Internet-connectivity eras (Australia) drawn as translucent background bands
 * on the timeline. Display-only metadata: this is historical context for the
 * timeline, not part of the ISP graph data model, so it lives in the frontend.
 *
 *   start  — first year of the era (inclusive)
 *   end    — last year (inclusive); null means "still current"
 *   color  — very light rgba tint for the background band
 *
 * The per-era toggles are built from this array (see graph.js setup).
 */
window.ERAS = [
  { id: 'predialup', label: 'Pre-Dialup (BBS / Academic)', start: 1980, end: 1993, color: 'rgba(150,150,155,0.14)' },
  { id: 'dialup',    label: 'Dialup',                     start: 1994, end: 2003, color: 'rgba(77,130,199,0.13)' },
  { id: 'dsl',       label: 'DSL / Cable',                start: 2001, end: 2017, color: 'rgba(90,160,110,0.13)' },
  { id: 'nbn',       label: 'NBN',                        start: 2015, end: null, color: 'rgba(46,170,180,0.13)' },
  { id: '2g',        label: '2G Mobile',                  start: 1995, end: 2008, color: 'rgba(205,150,55,0.13)' },
  { id: '3g',        label: '3G Mobile',                  start: 2004, end: 2014, color: 'rgba(146,110,200,0.13)' },
  { id: '4g',        label: '4G Mobile',                  start: 2012, end: 2022, color: 'rgba(202,104,140,0.13)' },
  { id: '5g',        label: '5G Mobile',                  start: 2020, end: null, color: 'rgba(106,94,190,0.13)' },
];