import * as React from "react";

export namespace Button {
  export type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export const Button = React.forwardRef<HTMLButtonElement, Button.Props>(
  ({ type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} {...props} />;
  }
);
Button.displayName = "ButtonPrimitive";
