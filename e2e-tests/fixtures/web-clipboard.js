/**
 * Clipboard HTML as browsers produce it when copying from ordinary web pages
 * and from Google Docs / Excel.
 */

// Typical news-article copy: divs, classes, heading, link — and an https image
const WEBPAGE_ARTICLE_WITH_IMAGE = `<div class="article-body" data-testid="article">
<h2 class="headline">Quarterly Results Announced</h2>
<div class="paragraph-wrapper"><p class="body-text">Revenue grew in the <b>third quarter</b>, the company said.</p></div>
<figure class="inline-image"><img src="https://cdn.example.com/photos/chart.jpg" alt="Revenue chart" width="640"></figure>
<div class="paragraph-wrapper"><p class="body-text">Read the <a href="https://news.example.com/full-story" class="story-link">full story</a> for details.</p></div>
</div>`;

// Same article without the image
const WEBPAGE_ARTICLE_NO_IMAGE = `<div class="article-body">
<h2 class="headline">Quarterly Results Announced</h2>
<div class="paragraph-wrapper"><p class="body-text">Revenue grew in the <b>third quarter</b>, the company said.</p></div>
<div class="paragraph-wrapper"><p class="body-text">Read the <a href="https://news.example.com/full-story" class="story-link">full story</a> for details.</p></div>
</div>`;

// Google Docs clipboard HTML: everything wrapped in a font-weight:normal <b>
// carrying the docs-internal-guid id; formatting expressed as span styles
// (font-weight:700 for bold, font-style:italic), lists as real ul/li with
// heavy inline styles, links wrapping styled spans.
const GDOCS_RICH_CONTENT = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre-wrap;">Bold opening line</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;font-weight:400;font-style:italic;vertical-align:baseline;white-space:pre-wrap;">Italic second line</span><span style="font-size:11pt;font-family:Arial,sans-serif;font-weight:400;white-space:pre-wrap;"> and plain text after it.</span></p><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;white-space:pre-wrap;">First bullet</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;white-space:pre-wrap;">Second bullet</span></p></li></ul><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;white-space:pre-wrap;">See </span><a href="https://docs.example.com/shared" style="text-decoration:none;"><span style="font-size:11pt;color:#1155cc;text-decoration:underline;white-space:pre-wrap;">the shared doc</span></a><span style="font-size:11pt;white-space:pre-wrap;"> for more.</span></p></b>`;

// Excel clipboard HTML: office namespaces, xl classes, x:num attributes, colgroup
const EXCEL_TABLE = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<body>
<table border=0 cellpadding=0 cellspacing=0 width=256 style='border-collapse:collapse;width:192pt'>
<colgroup><col width=128 style='width:96pt'><col width=128 style='width:96pt'></colgroup>
<tr height=21 style='height:16.0pt'>
 <td height=21 width=128 style='height:16.0pt;width:96pt' class=xl65>Region</td>
 <td width=128 class=xl65>Total</td>
</tr>
<tr height=21 style='height:16.0pt'>
 <td height=21 class=xl66>North</td>
 <td class=xl67 x:num align=right>1250</td>
</tr>
<tr height=21 style='height:16.0pt'>
 <td height=21 class=xl66>South</td>
 <td class=xl67 x:num align=right>980</td>
</tr>
</table>
</body>
</html>`;

module.exports = {
  WEBPAGE_ARTICLE_WITH_IMAGE,
  WEBPAGE_ARTICLE_NO_IMAGE,
  GDOCS_RICH_CONTENT,
  EXCEL_TABLE,
};
