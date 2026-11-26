import type { Preview } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { TimeDisplayProvider } from "@overworld/ui";
import "@wintermuted/ui-theme/index.css";
import "font-awesome/css/font-awesome.css";

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [
    withThemeByDataAttribute({
      themes: { Light: "light", Dark: "dark" },
      defaultTheme: "Light",
      attributeName: "data-theme"
    }),
    Story => (
      <TimeDisplayProvider>
        <Story />
      </TimeDisplayProvider>
    )
  ],
  parameters: {
    layout: "padded",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i }
    },
    a11y: { test: "todo" },
    options: {
      storySort: {
        order: ["Transit", "Time", "Alerts", "Search"]
      }
    }
  }
};

export default preview;
