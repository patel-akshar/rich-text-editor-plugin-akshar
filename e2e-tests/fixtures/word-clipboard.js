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

module.exports = {
  WORD_SIMPLE_PARAGRAPHS,
  WORD_BULLETED_LIST,
  WORD_NUMBERED_LIST,
  WORD_HARD_RETURNS,
  WORD_TABLE,
  WORD_UNQUOTED_ATTRS,
};
