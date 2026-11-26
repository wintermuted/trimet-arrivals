import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{Z as n,n as r}from"./iframe-Dbz6oMto.js";var i,a,o,s,c,l,u,d,f,p,m;function h(){return(h=e((()=>{r(),i=t(),{expect:a,userEvent:o,within:s}=__STORYBOOK_MODULE_TEST__,c={id:`parks`,label:`Example parks`,source:`Example catalog`,sourceUrl:`https://example.org/data`,license:`Example license`,licenseUrl:`https://example.org/license`,retrievedDate:`Nov 18, 2026`,updatedDate:`Nov 1, 2026`,coverage:`Illustrative sample coverage.`},l={title:`Places/Source provenance`,component:n,args:{sources:[c],description:(0,i.jsx)(`p`,{children:`Snapshots are not live listings. Example data only.`})},parameters:{docs:{description:{component:`Source/license attribution, host-formatted retrieval/update dates, and coverage in a native disclosure. The host supplies caveats and snapshot metadata. Optional noticeAfter preserves a notice's position among source records.`}}}},u={play:async({canvasElement:e})=>{let t=s(e);await o.click(t.getByText(`Data sources and coverage`)),await a(t.getByRole(`link`,{name:`Example catalog`})).toHaveAttribute(`href`,c.sourceUrl),await a(t.getByText(/Retrieved Nov 18, 2026/)).toBeVisible()}},d={args:{sources:[{...c,id:`context`,label:`Example context layer`,updatedDate:void 0,coverage:`1,234 mapped features; only tiles intersecting this map area load. Illustrative coverage.`},c],noticeAfter:1,notice:(0,i.jsx)(`p`,{children:`Illustrative regional attribution notice.`})}},f={args:{sources:[],notice:(0,i.jsx)(`p`,{children:`No source snapshots have been loaded yet.`})}},p={args:{sources:[{...c,source:`An unusually long example catalog name with detailed regional coverage information`}]}},m=[`Snapshot`,`MultipleSourcesAndNotice`,`NoSnapshotsLoaded`,`LongSourceName`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Data sources and coverage"));
    await expect(canvas.getByRole("link", {
      name: "Example catalog"
    })).toHaveAttribute("href", sample.sourceUrl);
    await expect(canvas.getByText(/Retrieved Nov 18, 2026/)).toBeVisible();
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    sources: [{
      ...sample,
      id: "context",
      label: "Example context layer",
      updatedDate: undefined,
      coverage: "1,234 mapped features; only tiles intersecting this map area load. Illustrative coverage."
    }, sample],
    noticeAfter: 1,
    notice: <p>Illustrative regional attribution notice.</p>
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    sources: [],
    notice: <p>No source snapshots have been loaded yet.</p>
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    sources: [{
      ...sample,
      source: "An unusually long example catalog name with detailed regional coverage information"
    }]
  }
}`,...p.parameters?.docs?.source}}}})))()}h();export{p as LongSourceName,d as MultipleSourcesAndNotice,f as NoSnapshotsLoaded,u as Snapshot,m as __namedExportsOrder,l as default};