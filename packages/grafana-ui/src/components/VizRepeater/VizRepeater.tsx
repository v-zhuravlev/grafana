import React, { PureComponent } from 'react';
import { VizOrientation } from '../../types';

interface Props<V, D> {
  /**
   * Optionally precalculate dimensions to support consistent behavior between repeated
   * values.  Two typical patterns are:
   * 1) Calculate raw values like font size etc and pass them to each vis
   * 2) find the maximum input values and pass that to the vis
   */
  calculateInternalDimensions?: (values: V[], width: number, height: number) => D;

  /**
   * Render a single value
   */
  renderValue: (value: V, width: number, height: number, dims: D) => JSX.Element;
  height: number;
  width: number;
  source: any; // If this changes, new values will be requested
  getValues: () => V[];
  renderCounter: number; // force update of values & render
  orientation: VizOrientation;
  itemSpacing?: number;
}

interface DefaultProps {
  itemSpacing: number;
}

type PropsWithDefaults<V, D> = Props<V, D> & DefaultProps;

interface State<V> {
  values: V[];
}

export class VizRepeater<V, D = {}> extends PureComponent<Props<V, D>, State<V>> {
  static defaultProps: DefaultProps = {
    itemSpacing: 10,
  };

  constructor(props: Props<V, D>) {
    super(props);

    this.state = {
      values: props.getValues(),
    };
  }

  componentDidUpdate(prevProps: Props<V, D>) {
    const { renderCounter, source } = this.props;
    if (renderCounter !== prevProps.renderCounter || source !== prevProps.source) {
      this.setState({ values: this.props.getValues() });
    }
  }

  getOrientation(): VizOrientation {
    const { orientation, width, height } = this.props;

    if (orientation === VizOrientation.Auto) {
      if (width > height) {
        return VizOrientation.Vertical;
      } else {
        return VizOrientation.Horizontal;
      }
    }

    return orientation;
  }

  render() {
    const { renderValue, height, width, itemSpacing, calculateInternalDimensions } = this.props as PropsWithDefaults<
      V,
      D
    >;
    const { values } = this.state;
    const orientation = this.getOrientation();

    const itemStyles: React.CSSProperties = {
      display: 'flex',
    };

    const repeaterStyle: React.CSSProperties = {
      display: 'flex',
    };

    let vizHeight = height;
    let vizWidth = width;

    if (orientation === VizOrientation.Horizontal) {
      repeaterStyle.flexDirection = 'column';
      itemStyles.marginBottom = `${itemSpacing}px`;
      vizWidth = width;
      vizHeight = height / values.length - itemSpacing;
    } else {
      repeaterStyle.flexDirection = 'row';
      itemStyles.marginRight = `${itemSpacing}px`;
      vizHeight = height;
      vizWidth = width / values.length - itemSpacing;
    }

    itemStyles.width = `${vizWidth}px`;
    itemStyles.height = `${vizHeight}px`;

    const dims = calculateInternalDimensions ? calculateInternalDimensions(values, vizWidth, vizHeight) : ({} as D);
    return (
      <div style={repeaterStyle}>
        {values.map((value, index) => {
          return (
            <div key={index} style={itemStyles}>
              {renderValue(value, vizWidth, vizHeight, dims)}
            </div>
          );
        })}
      </div>
    );
  }
}
