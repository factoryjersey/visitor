/**
 * update-book.jsx: an InDesign script that goes into each InDesign package,
 * beside the IDMLs, to bring them into the book in one go. Run from the
 * package's folder (double-click in the Scripts panel, or File > Scripts >
 * Browse), it opens each of the book's documents in the package, saves it
 * as .indd in the working folder (the package folder's parent) under the
 * book's name, swaps it into the book where its earlier version (or the
 * merge file it replaces) sits, repaginates and saves the book.
 *
 * ExtendScript (InDesign's JavaScript, ES3): no let, no arrow functions.
 */
export function updateBookScript(issue: string): string {
  return `// update-book.jsx: puts guide.je's What's On and Tours documents for issue ${issue} into the book.
// Run it from InDesign: File > Scripts > Browse… (or double-click it in the Scripts panel once copied there).
// It saves each IDML here as .indd in the working folder, replacing last time's, swaps it into
// vjvg_${issue}.indb where its earlier version or the merge file sits, repaginates and saves the book.
#target indesign

(function () {
  var ISSUE = '${issue}';
  // The book's documents this updates: the IDML's name, and the names of what it replaces in the book.
  var DOCS = [
    { idml: 'whatson_events_' + ISSUE + '.idml', replaces: /^whatson_(merge_)?events_/i },
    { idml: 'whatson_tours_' + ISSUE + '.idml', replaces: /^whatson_(merge_)?tours_/i },
    // Pubs & bars, in place of the book's Out Out pages.
    { idml: 'vjvg_pubs_bars_' + ISSUE + '.idml', replaces: /^vjvg_(outout|pubs_bars)_/i }
    // Other venue sections, as the book takes them from guide.je, e.g.:
    // , { idml: 'vjvg_eat_' + ISSUE + '.idml', replaces: /^vjvg_(26_\\d_)?eat/i }
  ];

  // Sent one section at a time, the folder holds whichever were sent: those are the ones updated.
  var here = File($.fileName).parent;
  if (!anyIn(here)) {
    here = Folder.selectDialog('Choose the guide.je package folder (it holds whatson_events_' + ISSUE + '.idml or another section)');
    if (!here) return;
  }
  var working = here.parent;
  var report = [];
  var saved = [];

  var before = app.scriptPreferences.userInteractionLevel;
  app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
  try {
    for (var i = 0; i < DOCS.length; i++) {
      var idml = File(here + '/' + DOCS[i].idml);
      if (!idml.exists) continue;
      var target = File(working + '/' + DOCS[i].idml.replace(/\\.idml$/i, '.indd'));
      closeIfOpen(target);
      var doc = app.open(idml, false);
      relinkFrom(doc, Folder(here + '/Links'));
      doc.save(target);
      doc.close(SaveOptions.NO);
      saved.push({ file: target, replaces: DOCS[i].replaces });
      report.push('Saved ' + target.name);
    }
  } catch (e) {
    app.scriptPreferences.userInteractionLevel = before;
    alert('Stopped: ' + e.message + (e.line ? ' (line ' + e.line + ')' : ''));
    return;
  }
  app.scriptPreferences.userInteractionLevel = before;
  if (!saved.length) { alert('None of the book\\'s documents for ' + ISSUE + ' are in ' + here.fsName); return; }

  // The book: open already, or vjvg_<issue>.indb in the working folder, or chosen.
  var book = null;
  for (var b = 0; b < app.books.length; b++) if (app.books[b].name.toLowerCase() === ('vjvg_' + ISSUE + '.indb')) book = app.books[b];
  if (!book) {
    var bookFile = File(working + '/vjvg_' + ISSUE + '.indb');
    if (!bookFile.exists) bookFile = File.openDialog('Choose the book (vjvg_' + ISSUE + '.indb)', '*.indb');
    if (!bookFile) { alert(report.join('\\n') + '\\n\\nNo book chosen: the documents are saved but not in a book.'); return; }
    book = app.open(bookFile);
  }

  for (var s = 0; s < saved.length; s++) {
    var name = saved[s].file.name;
    var content = null;
    // Its own earlier version first, then what it replaces (the merge file of the edition before).
    for (var c = 0; c < book.bookContents.length; c++) if (book.bookContents[c].name === name) content = book.bookContents[c];
    if (!content) for (var d = 0; d < book.bookContents.length; d++) if (saved[s].replaces.test(book.bookContents[d].name)) { content = book.bookContents[d]; break; }
    if (content) {
      var was = content.name;
      content.replace(saved[s].file);
      report.push(was === name ? 'Updated ' + name + ' in the book' : 'Replaced ' + was + ' with ' + name + ' in the book');
    } else {
      book.bookContents.add(saved[s].file);
      report.push('Added ' + name + ' at the end of the book: drag it into place');
    }
  }
  try { book.repaginate(); } catch (e1) { report.push('Repaginate: ' + e1.message); }
  try { book.updateAllNumbers(); } catch (e2) { report.push('Update numbering: ' + e2.message); }
  book.save();
  report.push('', 'Book saved. To restyle from your style source, use Synchronize Book in the Book panel (styles and swatches; leave parent pages unticked to keep guide.je\\'s ears).');
  alert(report.join('\\n'));

  function anyIn(folder) {
    for (var a = 0; a < DOCS.length; a++) if (File(folder + '/' + DOCS[a].idml).exists) return true;
    return false;
  }

  /** A document open from the same file is closed first, unsaved, so the new one can take its place. */
  function closeIfOpen(file) {
    for (var k = app.documents.length - 1; k >= 0; k--) {
      try { if (app.documents[k].saved && app.documents[k].fullName.fsName === file.fsName) app.documents[k].close(SaveOptions.NO); } catch (e) {}
    }
  }

  /** Pictures InDesign could not find from the IDML's own paths, found in the package's Links folder by name. */
  function relinkFrom(doc, links) {
    if (!links.exists) return;
    for (var l = 0; l < doc.links.length; l++) {
      var link = doc.links[l];
      if (link.status !== LinkStatus.LINK_MISSING) continue;
      var f = File(links + '/' + link.name);
      if (f.exists) { try { link.relink(f); } catch (e) {} }
    }
  }
})();
`;
}
