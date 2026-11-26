import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{f as t,n}from"./iframe-CvjSoj0j.js";var r,i,a,o,s,c,l,u;function d(){return(d=e((()=>{n(),{expect:r,userEvent:i,waitFor:a,within:o}=__STORYBOOK_MODULE_TEST__,s={title:`Time/Display settings`,component:t,parameters:{docs:{description:{component:`Uses TimeDisplayProvider from the global preview. Preferences persist on the Storybook origin, separately from the app.`}}}},c={},l={play:async({canvasElement:e})=>{let t=o(e),n=t.getByRole(`combobox`,{name:`Clock`}),s=t.getByRole(`combobox`,{name:`Timezone`});await i.selectOptions(n,`24h`),await i.selectOptions(s,`utc`),await a(()=>{r(n).toHaveValue(`24h`),r(s).toHaveValue(`utc`)})}},u=[`Default`,`Choose24HourUtc`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const clock = canvas.getByRole("combobox", {
      name: "Clock"
    });
    const timezone = canvas.getByRole("combobox", {
      name: "Timezone"
    });
    await userEvent.selectOptions(clock, "24h");
    await userEvent.selectOptions(timezone, "utc");
    await waitFor(() => {
      expect(clock).toHaveValue("24h");
      expect(timezone).toHaveValue("utc");
    });
  }
}`,...l.parameters?.docs?.source}}}})))()}d();export{l as Choose24HourUtc,c as Default,u as __namedExportsOrder,s as default};