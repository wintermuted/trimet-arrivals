import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import ReloadButton from "./ReloadButton";

it("reloads when enabled but prevents another request while loading", async () => {
  const onClick = jest.fn();
  const user = userEvent.setup();
  const { rerender } = render(<ReloadButton disabled={false} onClick={onClick}>Reload</ReloadButton>);
  await user.click(screen.getByRole("button", { name: "Reload" }));
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(<ReloadButton disabled onClick={onClick}>Reload</ReloadButton>);
  expect(screen.getByRole("button", { name: "Reload" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Reload" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
