import * as React from "react";

export namespace Input {
  export type Props = React.InputHTMLAttributes<HTMLInputElement>;
}

export const Input = React.forwardRef<HTMLInputElement, Input.Props>(
  (props, ref) => {
    return <input ref={ref} {...props} />;
  }
);
Input.displayName = "InputPrimitive";
