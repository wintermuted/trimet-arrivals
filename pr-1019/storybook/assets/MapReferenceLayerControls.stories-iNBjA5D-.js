import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{$ as r,F as i,I as a,n as o}from"./iframe-Dbz6oMto.js";function s(e){let[t,n]=(0,c.useState)(e.layers);return(0,c.useEffect)(()=>n(e.layers),[e.layers]),(0,l.jsx)(r,{...e,layers:t.map(e=>({...e,onChange:t=>{e.onChange(t),n(n=>n.map(n=>n.id===e.id?{...n,checked:t}:n))}}))})}var c,l,u,d,f,p,m,h,g,_,v,y,b;function x(){return(x=e((()=>{o(),a(),c=t(),l=n(),{expect:u,fn:d,userEvent:f,within:p}=__STORYBOOK_MODULE_TEST__,m={title:`Places/Reference layer controls`,component:r,args:{layers:[{id:`trails`,label:`Example trails`,checked:!0,onChange:d(),swatch:{kind:`line`,color:`var(--wm-color-accent)`,dashed:!0},help:(0,l.jsxs)(`details`,{style:{position:`relative`},children:[(0,l.jsx)(`summary`,{"aria-label":`About example trails`,children:`Help`}),(0,l.jsx)(`p`,{style:{position:`absolute`,insetInlineEnd:0,zIndex:1,width:`min(240px, calc(100vw - 32px))`,padding:`var(--wm-space-2)`,background:`var(--wm-color-surface)`,border:`1px solid var(--wm-color-border)`},children:`Reference lines, not turn-by-turn routes.`})]})},{id:`crossings`,label:`Example crossings`,checked:!1,onChange:d(),swatch:{kind:`point`,color:`var(--wm-color-text-muted)`}}]},render:e=>(0,l.jsx)(s,{...e}),parameters:{docs:{description:{component:`Controlled visibility rows with line/point legends and separate host-supplied help and feed status. Map ownership, requests, legend colors, and warnings remain host-owned. Dependent controls appear only when the parent is selected.`}}}},h={play:async({canvasElement:e})=>{let t=p(e);await f.click(t.getByRole(`checkbox`,{name:`Example crossings`})),await u(t.getByRole(`checkbox`,{name:`Example crossings`})).toBeChecked(),await f.click(t.getByLabelText(`About example trails`)),await u(t.getByText(`Reference lines, not turn-by-turn routes.`)).toBeVisible(),await u(t.getByRole(`checkbox`,{name:`Example trails`})).toBeChecked(),await f.click(t.getByLabelText(`About example trails`))}},g=d(),_={args:{layers:[{id:`trails`,label:`Example trails`,checked:!0,onChange:d(),status:(0,l.jsx)(i,{size:`sm`,variant:`ghost`,onClick:g,"aria-label":`Retry example trails`,children:`Retry`}),children:(0,l.jsx)(`p`,{role:`alert`,children:`Could not refresh. Previously received lines remain visible.`})}]},play:async({canvasElement:e})=>{await f.click(p(e).getByRole(`button`,{name:`Retry example trails`})),await u(g).toHaveBeenCalled()}},v={args:{layers:[{id:`trails`,label:`Example trails`,checked:!0,onChange:d(),status:(0,l.jsx)(`span`,{role:`status`,children:`Loading...`})}]}},y={args:{layers:[{id:`neighborhoods`,label:`Example neighborhoods`,checked:!0,onChange:d(),swatch:{kind:`point`,color:`var(--wm-color-accent)`,square:!0},children:(0,l.jsxs)(`label`,{className:`transit-places-category transit-places-polygon-toggle`,children:[(0,l.jsx)(`input`,{type:`checkbox`,defaultChecked:!0}),`Show polygons`]})}]},play:async({canvasElement:e})=>{let t=p(e);await u(t.getByRole(`checkbox`,{name:`Show polygons`})).toBeVisible(),await f.click(t.getByRole(`checkbox`,{name:`Example neighborhoods`})),await u(t.queryByRole(`checkbox`,{name:`Show polygons`})).toBeNull()}},b=[`LineAndPointLegends`,`FailedWithRetry`,`Loading`,`DependentPolygonControl`],h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", {
      name: "Example crossings"
    }));
    await expect(canvas.getByRole("checkbox", {
      name: "Example crossings"
    })).toBeChecked();
    await userEvent.click(canvas.getByLabelText("About example trails"));
    await expect(canvas.getByText("Reference lines, not turn-by-turn routes.")).toBeVisible();
    await expect(canvas.getByRole("checkbox", {
      name: "Example trails"
    })).toBeChecked();
    await userEvent.click(canvas.getByLabelText("About example trails"));
  }
}`,...h.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    layers: [{
      id: "trails",
      label: "Example trails",
      checked: true,
      onChange: fn(),
      status: <Button size="sm" variant="ghost" onClick={retry} aria-label="Retry example trails">
            Retry
          </Button>,
      children: <p role="alert">
            Could not refresh. Previously received lines remain visible.
          </p>
    }]
  },
  play: async ({
    canvasElement
  }) => {
    await userEvent.click(within(canvasElement).getByRole("button", {
      name: "Retry example trails"
    }));
    await expect(retry).toHaveBeenCalled();
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    layers: [{
      id: "trails",
      label: "Example trails",
      checked: true,
      onChange: fn(),
      status: <span role="status">Loading...</span>
    }]
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    layers: [{
      id: "neighborhoods",
      label: "Example neighborhoods",
      checked: true,
      onChange: fn(),
      swatch: {
        kind: "point",
        color: "var(--wm-color-accent)",
        square: true
      },
      children: <label className="transit-places-category transit-places-polygon-toggle">
            <input type="checkbox" defaultChecked />
            Show polygons
          </label>
    }]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("checkbox", {
      name: "Show polygons"
    })).toBeVisible();
    await userEvent.click(canvas.getByRole("checkbox", {
      name: "Example neighborhoods"
    }));
    await expect(canvas.queryByRole("checkbox", {
      name: "Show polygons"
    })).toBeNull();
  }
}`,...y.parameters?.docs?.source}}}})))()}x();export{y as DependentPolygonControl,_ as FailedWithRetry,h as LineAndPointLegends,v as Loading,b as __namedExportsOrder,m as default};