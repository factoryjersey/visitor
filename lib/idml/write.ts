/**
 * An InDesign document as IDML, InDesign's open format (File > Open, then
 * save as .indd): pages in facing spreads, each with its frames, styles
 * named for what they hold, and the edition's swatches. Pure: given the
 * pages, it returns the package's files; the caller zips them, mimetype
 * first.
 *
 * Measurements come in millimetres from the page's top left, as the proof
 * lays them out, and are written in points in spread coordinates: InDesign
 * puts a spread's origin on its spine, halfway down.
 */

export const MM = 72 / 25.4;
export const PAGE_W = 115;
export const PAGE_H = 165;
const W = PAGE_W * MM;
const H = PAGE_H * MM;
const DOM = '18.0';
const PKG = 'http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging';

export type Run = { text: string; char?: string; pageNumber?: boolean };
export type Para = { style: string; runs: Run[]; size?: number; colour?: string };
export type Box = { x: number; y: number; w: number; h: number };
export type Item =
  | (Box & { kind: 'rect'; fill: string; tint?: number })
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; weight: number }
  | (Box & { kind: 'text'; paras: Para[]; fill?: string; vertical?: boolean; centre?: boolean; thread?: string; inset?: number })
  | (Box & { kind: 'image'; link: string; px?: number; py?: number; fill?: string });
/** A page, and the parent page (master) it takes its ears and folio from. */
export type IdmlPage = { n: number; items: Item[]; master?: string };
/**
 * A parent page (master) spread: its left and right pages' items, on the ears
 * layer above the pages' own, and the parent it is based on, so the ears and
 * folio are drawn once and changed in one place.
 */
export type IdmlMaster = { id: string; prefix: string; name: string; basedOn?: string; left: Item[]; right: Item[] };

export type ParaStyle = { name: string; font: string; style: string; size: number; leading?: number; colour: string; caps?: boolean; before?: number; after?: number; tracking?: number; italic?: boolean };
export type CharStyle = { name: string; font?: string; style?: string; size?: number; colour?: string; caps?: boolean };
export type Swatch = { name: string; cmyk: readonly [number, number, number, number] };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Characters XML may not carry, and line breaks within a paragraph, as InDesign takes them.
const text = (s: string) => esc(s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')).replace(/\t/g, '&#x9;').replace(/\n/g, '&#x2028;');
const id = (prefix: string, name: string) => `${prefix}/${name.replace(/[^\w]+/g, '_')}`;
export const colourRef = (name: string) => (name === 'Paper' || name === 'Black' ? `Color/${name}` : id('Color', name));
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** The four corners of a box, in spread coordinates, as IDML paths list them: top left, bottom left, bottom right, top right. */
function path(b: Box, dx: number): string {
  const l = dx + b.x * MM;
  const t = -H / 2 + b.y * MM;
  const r = l + b.w * MM;
  const bt = t + b.h * MM;
  const pt = (x: number, y: number) => `<PathPointType Anchor="${fmt(x)} ${fmt(y)}" LeftDirection="${fmt(x)} ${fmt(y)}" RightDirection="${fmt(x)} ${fmt(y)}"/>`;
  return `<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>${pt(l, t)}${pt(l, bt)}${pt(r, bt)}${pt(r, t)}</PathPointArray></GeometryPathType></PathGeometry></Properties>`;
}

/** A box of the given width and height centred on its own origin, for a frame placed by its transform. */
function pathLocal(w: number, h: number): string {
  return path({ x: -w / 2 / MM, y: (H / 2 - h / 2) / MM, w: w / MM, h: h / MM }, 0);
}

export type IdmlInput = {
  pages: IdmlPage[];
  /** Parent pages, parents before the ones based on them. Without, a blank A-Master. */
  masters?: IdmlMaster[];
  firstPage: number;
  paraStyles: ParaStyle[];
  charStyles: CharStyle[];
  swatches: Swatch[];
};

/** The package's files, path to contents, mimetype first. */
export function idmlFiles(doc: IdmlInput): [string, string][] {
  const files: [string, string][] = [];
  const stories: string[] = [];
  let seq = 0;
  const next = (p: string) => `${p}${(seq++).toString(36)}`;
  const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`;

  // Threads: frames sharing a thread name are one story, flowing frame to frame in page order.
  const threadStory = new Map<string, string>();
  const threadFrames = new Map<string, string[]>();

  // Facing spreads, as the book pairs them: an even page on the left.
  const spreads: IdmlPage[][] = [];
  for (const p of doc.pages) {
    const last = spreads.at(-1);
    if (last && last.length === 1 && last[0]!.n % 2 === 0 && p.n === last[0]!.n + 1) last.push(p);
    else spreads.push([p]);
  }

  const frameIds = new Map<object, string>();
  for (const sp of spreads) for (const p of sp) for (const it of p.items) if (it.kind === 'text') {
    const fid = next('tf');
    frameIds.set(it, fid);
    if (it.thread) {
      if (!threadStory.has(it.thread)) threadStory.set(it.thread, next('st'));
      threadFrames.set(it.thread, [...(threadFrames.get(it.thread) ?? []), fid]);
    }
  }
  const threadParas = new Map<string, Para[]>();

  /** A page's or a parent page's items as spread XML, on the given layer. */
  function renderItems(items: Item[], dx: number, layer: string): string {
    let body = '';
    for (const it of items) {
        if (it.kind === 'rect') {
          body += `<Rectangle Self="${next('r')}" ContentType="Unassigned" ItemLayer="${layer}" FillColor="${colourRef(it.fill)}"${it.tint !== undefined ? ` FillTint="${it.tint}"` : ''} StrokeColor="Swatch/None" StrokeWeight="0" AppliedObjectStyle="ObjectStyle/$ID/[None]" ItemTransform="1 0 0 1 0 0">${path(it, dx)}</Rectangle>`;
        } else if (it.kind === 'line') {
          const ax = dx + it.x1 * MM, ay = -H / 2 + it.y1 * MM, bx = dx + it.x2 * MM, by = -H / 2 + it.y2 * MM;
          const pt = (x: number, y: number) => `<PathPointType Anchor="${fmt(x)} ${fmt(y)}" LeftDirection="${fmt(x)} ${fmt(y)}" RightDirection="${fmt(x)} ${fmt(y)}"/>`;
          body += `<GraphicLine Self="${next('gl')}" ItemLayer="${layer}" StrokeColor="${colourRef(it.stroke)}" StrokeWeight="${fmt(it.weight)}" FillColor="Swatch/None" AppliedObjectStyle="ObjectStyle/$ID/[None]" ItemTransform="1 0 0 1 0 0"><Properties><PathGeometry><GeometryPathType PathOpen="true"><PathPointArray>${pt(ax, ay)}${pt(bx, by)}</PathPointArray></GeometryPathType></PathGeometry></Properties></GraphicLine>`;
        } else if (it.kind === 'image') {
          const l = dx + it.x * MM, t = -H / 2 + it.y * MM, fw = it.w * MM, fh = it.h * MM;
          // Filled proportionally, as the proof crops it, taking the picture at 72 pixels to the inch: InDesign refits it on any change (auto-fit).
          let img = '';
          if (it.px && it.py) {
            const s = Math.max(fw / it.px, fh / it.py);
            const tx = l + (fw - it.px * s) / 2, ty = t + (fh - it.py * s) / 2;
            img = `<Image Self="${next('im')}" ItemTransform="${fmt(s)} 0 0 ${fmt(s)} ${fmt(tx)} ${fmt(ty)}"><Properties><GraphicBounds Left="0" Top="0" Right="${it.px}" Bottom="${it.py}"/></Properties><Link Self="${next('ln')}" LinkResourceURI="file:${esc(it.link)}" StoredState="Normal"/></Image>`;
          }
          body += `<Rectangle Self="${next('r')}" ContentType="GraphicType" ItemLayer="${layer}" FillColor="${it.fill ? colourRef(it.fill) : 'Swatch/None'}" StrokeColor="Swatch/None" StrokeWeight="0" AppliedObjectStyle="ObjectStyle/$ID/[Normal Graphics Frame]" ItemTransform="1 0 0 1 0 0">${path(it, dx)}<FrameFittingOption AutoFit="true" FittingOnEmptyFrame="FillProportionally" FittingAlignment="CenterAnchor"/>${img}</Rectangle>`;
        } else {
          const fid = frameIds.get(it) ?? next('tf');
          let story: string;
          let prev = 'n', nxt = 'n';
          if (it.thread) {
            story = threadStory.get(it.thread)!;
            const fr = threadFrames.get(it.thread)!;
            const i = fr.indexOf(fid);
            prev = fr[i - 1] ?? 'n';
            nxt = fr[i + 1] ?? 'n';
            threadParas.set(it.thread, [...(threadParas.get(it.thread) ?? []), ...it.paras]);
          } else {
            story = next('st');
            stories.push(story);
            files.push([`Stories/Story_${story}.xml`, storyXml(story, it.paras)]);
          }
          const inset = fmt((it.inset ?? 0) * MM);
          // A tab's word runs down the page edge: the frame drawn across, about its centre, and turned a quarter clockwise.
          const cx = dx + (it.x + it.w / 2) * MM, cy = -H / 2 + (it.y + it.h / 2) * MM;
          const geometry = it.vertical ? pathLocal(it.h * MM, it.w * MM) : path(it, dx);
          const transform = it.vertical ? `0 1 -1 0 ${fmt(cx)} ${fmt(cy)}` : '1 0 0 1 0 0';
          body += `<TextFrame Self="${fid}" ParentStory="${story}" PreviousTextFrame="${prev}" NextTextFrame="${nxt}" ContentType="TextType" ItemLayer="${layer}" FillColor="${it.fill ? colourRef(it.fill) : 'Swatch/None'}" StrokeColor="Swatch/None" StrokeWeight="0" AppliedObjectStyle="ObjectStyle/$ID/[Normal Text Frame]" ItemTransform="${transform}">${geometry}<TextFramePreference TextColumnCount="1" AutoSizingType="Off" VerticalJustification="${it.centre ? 'CenterAlign' : 'TopAlign'}" InsetSpacing="${inset} ${inset} ${inset} ${inset}" FirstBaselineOffset="AscentOffset" IgnoreWrap="false"/></TextFrame>`;
        }
    }
    return body;
  }

  const spreadFiles: string[] = [];
  let pageCount = 0;
  const firstPageId: string[] = [];
  spreads.forEach((sp) => {
    const sid = next('sp');
    let body = '';
    for (const p of sp) {
      const left = p.n % 2 === 0;
      const dx = left ? -W : 0;
      const pid = next('pg');
      if (!firstPageId.length) firstPageId.push(pid);
      pageCount += 1;
      body += `<Page Self="${pid}" Name="${p.n}" AppliedMaster="${p.master ?? masters[0]!.id}" GeometricBounds="0 0 ${fmt(H)} ${fmt(W)}" ItemTransform="1 0 0 1 ${fmt(dx)} ${fmt(-H / 2)}" MasterPageTransform="1 0 0 1 0 0" OverrideList=""><Properties><PageColor type="enumeration">UseMasterColor</PageColor></Properties><MarginPreference ColumnCount="2" ColumnGutter="${fmt(3.9 * MM)}" Top="${fmt(11.6 * MM)}" Bottom="${fmt(11 * MM)}" Left="${fmt((left ? 7.9 : 12) * MM)}" Right="${fmt((left ? 12 : 7.9) * MM)}" ColumnDirection="Horizontal" ColumnsPositions="0 ${fmt(45.5 * MM)} ${fmt(49.4 * MM)} ${fmt(94.9 * MM)}"/></Page>`;
      body += renderItems(p.items, dx, 'uL');
    }
    spreadFiles.push(sid);
    files.push([`Spreads/Spread_${sid}.xml`, xml(`<idPkg:Spread xmlns:idPkg="${PKG}" DOMVersion="${DOM}"><Spread Self="${sid}" PageCount="${sp.length}" BindingLocation="${sp[0]!.n % 2 === 0 ? 1 : 0}" AllowPageShuffle="true" ShowMasterItems="true" ItemTransform="1 0 0 1 0 0" FlattenerOverride="Default">${body}</Spread></idPkg:Spread>`)]);
  });
  for (const [thread, story] of threadStory) {
    stories.push(story);
    files.push([`Stories/Story_${story}.xml`, storyXml(story, threadParas.get(thread) ?? [])]);
  }

  const masters: IdmlMaster[] = doc.masters?.length ? doc.masters : [{ id: 'umA', prefix: 'A', name: 'Master', left: [], right: [] }];
  const masterFiles = masters.map((m): [string, string] => {
    const page = (side: 'l' | 'r') => `<Page Self="${m.id}${side}" Name="${esc(m.prefix)}" AppliedMaster="${m.basedOn ?? 'n'}" GeometricBounds="0 0 ${fmt(H)} ${fmt(W)}" ItemTransform="1 0 0 1 ${side === 'l' ? fmt(-W) : 0} ${fmt(-H / 2)}" MasterPageTransform="1 0 0 1 0 0"><MarginPreference ColumnCount="2" ColumnGutter="${fmt(3.9 * MM)}" Top="${fmt(11.6 * MM)}" Bottom="${fmt(11 * MM)}" Left="${fmt((side === 'l' ? 7.9 : 12) * MM)}" Right="${fmt((side === 'l' ? 12 : 7.9) * MM)}" ColumnDirection="Horizontal" ColumnsPositions="0 ${fmt(45.5 * MM)} ${fmt(49.4 * MM)} ${fmt(94.9 * MM)}"/></Page>`;
    const items = renderItems(m.left, -W, 'uE') + renderItems(m.right, 0, 'uE');
    return [`MasterSpreads/MasterSpread_${m.id}.xml`, xml(`<idPkg:MasterSpread xmlns:idPkg="${PKG}" DOMVersion="${DOM}"><MasterSpread Self="${m.id}" Name="${esc(`${m.prefix}-${m.name}`)}" NamePrefix="${esc(m.prefix)}" BaseName="${esc(m.name)}" ShowMasterItems="true" PageCount="2" ItemTransform="1 0 0 1 0 0">${page('l')}${page('r')}${items}</MasterSpread></idPkg:MasterSpread>`)];
  });

  const graphic = `<idPkg:Graphic xmlns:idPkg="${PKG}" DOMVersion="${DOM}">`
    + '<Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" ColorOverride="Specialblack" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Black" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>'
    + '<Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" ColorOverride="Specialpaper" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Paper" ColorEditable="true" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>'
    + '<Color Self="Color/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" ColorOverride="Specialregistration" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Registration" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>'
    + doc.swatches.map((w) => `<Color Self="${colourRef(w.name)}" Model="Process" Space="CMYK" ColorValue="${w.cmyk.join(' ')}" ColorOverride="Normal" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="${esc(w.name)}" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937"/>`).join('')
    + '<Swatch Self="Swatch/None" Name="None" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>'
    + '<StrokeStyle Self="StrokeStyle/$ID/Solid" Name="$ID/Solid"/>'
    + '</idPkg:Graphic>';

  const fontProps = (font: string) => `<Properties><AppliedFont type="string">${esc(font)}</AppliedFont></Properties>`;
  const styles = `<idPkg:Styles xmlns:idPkg="${PKG}" DOMVersion="${DOM}">`
    + '<RootCharacterStyleGroup Self="u79"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Imported="false" Name="$ID/[No character style]"/>'
    + doc.charStyles.map((c) => `<CharacterStyle Self="${id('CharacterStyle', c.name)}" Name="${esc(c.name)}"${c.style ? ` FontStyle="${esc(c.style)}"` : ''}${c.size ? ` PointSize="${c.size}"` : ''}${c.colour ? ` FillColor="${colourRef(c.colour)}"` : ''}${c.caps ? ' Capitalization="AllCaps"' : ''}>${c.font ? fontProps(c.font) : ''}</CharacterStyle>`).join('')
    + '</RootCharacterStyleGroup>'
    + '<RootParagraphStyleGroup Self="u78"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]" Imported="false"/><ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" Imported="false"/>'
    + doc.paraStyles.map((p) => `<ParagraphStyle Self="${id('ParagraphStyle', p.name)}" Name="${esc(p.name)}" FontStyle="${esc(p.style)}" PointSize="${p.size}" FillColor="${colourRef(p.colour)}" SpaceBefore="${fmt((p.before ?? 0) * MM)}" SpaceAfter="${fmt((p.after ?? 0) * MM)}"${p.caps ? ' Capitalization="AllCaps"' : ''}${p.tracking ? ` Tracking="${p.tracking}"` : ''} Hyphenation="false"><Properties><BasedOn type="string">$ID/[No paragraph style]</BasedOn><AppliedFont type="string">${esc(p.font)}</AppliedFont><Leading type="unit">${fmt(p.leading ?? p.size * 1.15)}</Leading></Properties></ParagraphStyle>`).join('')
    + '</RootParagraphStyleGroup>'
    + '<RootObjectStyleGroup Self="u8a"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/><ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" Name="$ID/[Normal Graphics Frame]"/><ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]"/></RootObjectStyleGroup>'
    + '</idPkg:Styles>';

  const prefs = `<idPkg:Preferences xmlns:idPkg="${PKG}" DOMVersion="${DOM}"><DocumentPreference PageHeight="${fmt(H)}" PageWidth="${fmt(W)}" PagesPerDocument="${pageCount}" FacingPages="true" DocumentBleedTopOffset="${fmt(3 * MM)}" DocumentBleedBottomOffset="${fmt(3 * MM)}" DocumentBleedInsideOrLeftOffset="${fmt(3 * MM)}" DocumentBleedOutsideOrRightOffset="${fmt(3 * MM)}" DocumentBleedUniformSize="true" SlugTopOffset="${fmt(6 * MM)}" SlugBottomOffset="${fmt(6 * MM)}" SlugInsideOrLeftOffset="${fmt(6 * MM)}" SlugRightOrOutsideOffset="${fmt(6 * MM)}" DocumentSlugUniformSize="true" AllowPageShuffle="true" PageBinding="LeftToRight" Intent="PrintIntent" StartPageNumber="${doc.firstPage}"/><ViewPreference HorizontalMeasurementUnits="Millimeters" VerticalMeasurementUnits="Millimeters" RulerOrigin="SpreadOrigin"/></idPkg:Preferences>`;

  const fonts = `<idPkg:Fonts xmlns:idPkg="${PKG}" DOMVersion="${DOM}"/>`;
  const backing = `<idPkg:BackingStory xmlns:idPkg="${PKG}" DOMVersion="${DOM}"><XmlStory Self="ubs"><ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/[No paragraph style]"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"/></ParagraphStyleRange></XmlStory></idPkg:BackingStory>`;
  const tags = `<idPkg:Tags xmlns:idPkg="${PKG}" DOMVersion="${DOM}"><XMLTag Self="XMLTag/Root" Name="Root"/></idPkg:Tags>`;

  const designmap = `<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="18.0(XX)" ?>\n<Document xmlns:idPkg="${PKG}" DOMVersion="${DOM}" Self="d" StoryList="${stories.join(' ')}" ZeroPoint="0 0" ActiveLayer="uL" CMYKProfile="Coated FOGRA39 (ISO 12647-2:2004)" RGBProfile="sRGB IEC61966-2.1" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk" AccurateLABSpots="false">`
    + '<idPkg:Graphic src="Resources/Graphic.xml"/><idPkg:Fonts src="Resources/Fonts.xml"/><idPkg:Styles src="Resources/Styles.xml"/><idPkg:Preferences src="Resources/Preferences.xml"/><idPkg:Tags src="XML/Tags.xml"/>'
    // The ears and folio on a layer of their own, above the pages', so a picture to the edge does not cover them.
    + '<Layer Self="uE" Name="Ears" Visible="true" Locked="false" IgnoreWrap="true" ShowGuides="true" LockGuides="false" UI="true" Expendable="true" Printable="true"><Properties><LayerColor type="enumeration">Red</LayerColor></Properties></Layer>'
    + '<Layer Self="uL" Name="Layer 1" Visible="true" Locked="false" IgnoreWrap="false" ShowGuides="true" LockGuides="false" UI="true" Expendable="true" Printable="true"><Properties><LayerColor type="enumeration">LightBlue</LayerColor></Properties></Layer>'
    + masterFiles.map(([path]) => `<idPkg:MasterSpread src="${path}"/>`).join('')
    + spreadFiles.map((s) => `<idPkg:Spread src="Spreads/Spread_${s}.xml"/>`).join('')
    + `<Section Self="sec" Length="${pageCount}" Name="" ContinueNumbering="false" IncludeSectionPrefix="false" PageNumberStyle="Arabic" PageStart="${firstPageId[0] ?? 'n'}" PageNumberStart="${doc.firstPage}" SectionPrefix="" Marker=""/>`
    + '<idPkg:BackingStory src="XML/BackingStory.xml"/>'
    + stories.map((s) => `<idPkg:Story src="Stories/Story_${s}.xml"/>`).join('')
    + '</Document>';

  return [
    ['mimetype', 'application/vnd.adobe.indesign-idml-package'],
    ['META-INF/container.xml', xml('<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>')],
    ['designmap.xml', xml(designmap)],
    ['Resources/Graphic.xml', xml(graphic)],
    ['Resources/Fonts.xml', xml(fonts)],
    ['Resources/Styles.xml', xml(styles)],
    ['Resources/Preferences.xml', xml(prefs)],
    ...masterFiles,
    ['XML/BackingStory.xml', xml(backing)],
    ['XML/Tags.xml', xml(tags)],
    ...files,
  ];

  function storyXml(sid: string, paras: Para[]): string {
    const body = paras.map((p, i) => {
      const runs = p.runs.map((r) => `<CharacterStyleRange AppliedCharacterStyle="${r.char ? id('CharacterStyle', r.char) : 'CharacterStyle/$ID/[No character style]'}">${r.pageNumber ? '<?ACE 18?>' : `<Content>${text(r.text)}</Content>`}</CharacterStyleRange>`).join('');
      const brk = i < paras.length - 1 ? '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"><Br/></CharacterStyleRange>' : '';
      return `<ParagraphStyleRange AppliedParagraphStyle="${id('ParagraphStyle', p.style)}"${p.size ? ` PointSize="${p.size}"` : ''}${p.colour ? ` FillColor="${colourRef(p.colour)}"` : ''}>${runs}${brk}</ParagraphStyleRange>`;
    }).join('');
    return xml(`<idPkg:Story xmlns:idPkg="${PKG}" DOMVersion="${DOM}"><Story Self="${sid}" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n"><StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>${body}</Story></idPkg:Story>`);
  }
}
