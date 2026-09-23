/**
 * Clipboard HTML as browsers produce it when copying from ordinary web pages
 * and from Excel.
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
  EXCEL_TABLE,
};
