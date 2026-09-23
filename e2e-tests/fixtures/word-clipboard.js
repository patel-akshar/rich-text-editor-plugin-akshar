/**
 * Realistic MS Word clipboard HTML fixtures.
 * These mirror what Word actually places on the clipboard (text/html flavor):
 * mso-* styles, MsoNormal classes, <![if !supportLists]> list-marker conditionals,
 * o:p tags, and source newlines inside conditional blocks.
 */

const WORD_SIMPLE_PARAGRAPHS = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta name=Generator content="Microsoft Word 15"></head>
<body lang=EN-US style='tab-interval:.5in'>
<p class=MsoNormal style='margin-bottom:0in;line-height:normal'><span style='font-size:11.0pt;font-family:"Calibri",sans-serif;mso-ascii-theme-font:minor-latin'>First paragraph from Word.<o:p></o:p></span></p>
<p class=MsoNormal style='margin-bottom:0in'><b><span style='font-size:11.0pt;mso-bidi-font-family:Calibri'>Bold second paragraph.</span></b><o:p></o:p></p>
</body>
</html>`;

const WORD_BULLETED_LIST = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
style='font-family:Symbol;mso-fareast-font-family:Symbol'><span
style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]>Alpha item<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
style='font-family:Symbol;mso-fareast-font-family:Symbol'><span
style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]>Beta item<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
style='font-family:Symbol;mso-fareast-font-family:Symbol'><span
style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]>Gamma item<o:p></o:p></p>
</body>
</html>`;

const WORD_NUMBERED_LIST = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;
</span></span><![endif]>Step one<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;
</span></span><![endif]>Step two<o:p></o:p></p>
</body>
</html>`;

// Word "hard return" (Shift+Enter) inside a single paragraph
const WORD_HARD_RETURNS = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoNormal><span style='font-size:11.0pt'>Line one before break<br style='mso-special-character:line-break'>
Line two after break<o:p></o:p></span></p>
</body>
</html>`;

const WORD_TABLE = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0 style='border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt;mso-yfti-tbllook:1184'>
 <tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes'>
  <td width=312 valign=top style='width:233.75pt;border:solid windowtext 1.0pt;mso-border-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal><b>Header A</b><o:p></o:p></p>
  </td>
  <td width=312 valign=top style='width:233.75pt;border:solid windowtext 1.0pt;border-left:none;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal><b>Header B</b><o:p></o:p></p>
  </td>
 </tr>
 <tr style='mso-yfti-irow:1;mso-yfti-lastrow:yes'>
  <td width=312 valign=top style='width:233.75pt;border:solid windowtext 1.0pt;border-top:none;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal>Cell one<o:p></o:p></p>
  </td>
  <td width=312 valign=top style='width:233.75pt;border-top:none;border-left:none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal>Cell two<o:p></o:p></p>
  </td>
 </tr>
</table>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
</body>
</html>`;

// Word-style markup with unquoted attributes (older Word/Outlook exports)
const WORD_UNQUOTED_ATTRS = `<html>
<body>
<table border=1 cellspacing=0 cellpadding=0 width=400>
<tr><td width=200><p class=MsoNormal>Unquoted cell</p></td><td width=200><p class=MsoNormal>Second</p></td></tr>
</table>
</body>
</html>`;

// The ORIGINAL reported bug: Word pretty-prints its clipboard HTML with source
// newlines BETWEEN inline spans inside a single paragraph. Those must collapse
// to spaces, not become <br>s that split one sentence across lines.
const WORD_INLINE_SPAN_NEWLINES = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoNormal>
<span style='font-size:11.0pt'>The </span>
<span style='font-size:11.0pt'><a href="https://example.com/ob">Orange Book</a></span>
<span style='font-size:11.0pt'> was searched on 06/26/2026.</span>
</p>
</body>
</html>`;

// Hyperlink as Word puts it on the clipboard: anchor wrapping styled spans
const WORD_HYPERLINK = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoNormal>Read the <a href="https://docs.example.com/guide"><span style='color:#0563C1;mso-themecolor:hyperlink;text-decoration:underline'>full guide</span></a> before continuing.<o:p></o:p></p>
<p class=MsoNormal>Contact <a href="mailto:team@example.com"><span style='color:#0563C1'>the team</span></a> with questions.<o:p></o:p></p>
</body>
</html>`;

// Mixed character formatting: bold, italic, underline, strikethrough, color, size
const WORD_FORMATTING_STYLES = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoNormal><b>Bold text</b>, <i>italic text</i>, <u>underlined text</u>, and <s>struck text</s>.<o:p></o:p></p>
<p class=MsoNormal><span style='color:#FF0000;mso-themecolor:accent2'>Red text</span> and <span style='font-size:18.0pt;line-height:107%'>large text</span> and <sup>superscript</sup> and <sub>subscript</sub>.<o:p></o:p></p>
</body>
</html>`;

// Embedded image as Word puts it on the clipboard: VML shape + file:/// fallback img.
// The file:/// source points at a temp file on the COPIER's machine — no browser
// can load it from a web page, so the reference is dead weight by nature.
const WORD_EMBEDDED_IMAGE = `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<body lang=EN-US>
<p class=MsoNormal>Text before the image.<o:p></o:p></p>
<p class=MsoNormal><!--[if gte vml 1]><v:shape id="Picture_x0020_1" o:spid="_x0000_i1025" type="#_x0000_t75" style='width:120pt;height:90pt'>
<v:imagedata src="file:///C:/Users/AKSHAR~1/AppData/Local/Temp/msohtmlclip1/01/clip_image001.png" o:title=""/>
</v:shape><![endif]--><![if !vml]><img width=160 height=120
src="file:///C:/Users/AKSHAR~1/AppData/Local/Temp/msohtmlclip1/01/clip_image002.png" v:shapes="Picture_x0020_1"><![endif]><o:p></o:p></p>
<p class=MsoNormal>Text after the image.<o:p></o:p></p>
</body>
</html>`;

module.exports = {
  WORD_SIMPLE_PARAGRAPHS,
  WORD_INLINE_SPAN_NEWLINES,
  WORD_BULLETED_LIST,
  WORD_NUMBERED_LIST,
  WORD_HARD_RETURNS,
  WORD_TABLE,
  WORD_UNQUOTED_ATTRS,
  WORD_HYPERLINK,
  WORD_FORMATTING_STYLES,
  WORD_EMBEDDED_IMAGE,
};
