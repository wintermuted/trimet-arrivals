import React from "react";
import MainNavigationMenu from "./MainNavigationMenu";

interface Props {
  numberOfBookmarks: number;
  timeOfLastLoad: string;
}

export default class MainNavigationComponent extends React.Component<Props> {
  public render() {
    const { numberOfBookmarks, timeOfLastLoad } = this.props;

    return (
      <MainNavigationMenu
        numberOfBookmarks={numberOfBookmarks}
        timeOfLastLoad={timeOfLastLoad}
      />
    );
  }
}
