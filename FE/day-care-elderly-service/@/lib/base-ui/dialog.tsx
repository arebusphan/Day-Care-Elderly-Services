import * as React from "react";
import { createPortal } from "react-dom";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog.Root");
  }
  return context;
}

export namespace Dialog {
  export namespace Root {
    export interface Props {
      open?: boolean;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
      children?: React.ReactNode;
      [key: string]: any;
    }
  }

  export function Root({
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    children,
  }: Root.Props) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = React.useCallback(
      (nextOpen: boolean) => {
        if (!isControlled) {
          setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
      },
      [isControlled, onOpenChange]
    );

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, setOpen]);

    return (
      <DialogContext.Provider value={{ open, setOpen }}>
        {children}
      </DialogContext.Provider>
    );
  }

  export namespace Trigger {
    export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      asChild?: boolean;
    }
  }

  export const Trigger = React.forwardRef<HTMLButtonElement, Trigger.Props>(
    ({ onClick, children, ...props }, ref) => {
      const { setOpen } = useDialogContext();
      return (
        <button
          ref={ref}
          type="button"
          onClick={(e) => {
            onClick?.(e);
            if (!e.defaultPrevented) {
              setOpen(true);
            }
          }}
          {...props}
        >
          {children}
        </button>
      );
    }
  );
  Trigger.displayName = "DialogTrigger";

  export namespace Portal {
    export interface Props {
      children?: React.ReactNode;
      container?: HTMLElement;
    }
  }

  export function Portal({ children, container }: Portal.Props) {
    const { open } = useDialogContext();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted || !open) return null;
    const target = container || (typeof document !== "undefined" ? document.body : null);
    return target ? createPortal(children, target) : <>{children}</>;
  }

  export namespace Backdrop {
    export interface Props extends React.HTMLAttributes<HTMLDivElement> {}
  }

  export const Backdrop = React.forwardRef<HTMLDivElement, Backdrop.Props>(
    ({ className, onClick, ...props }, ref) => {
      const { open, setOpen } = useDialogContext();
      if (!open) return null;

      return (
        <div
          ref={ref}
          className={className}
          data-open={open ? "" : undefined}
          data-closed={!open ? "" : undefined}
          onClick={(e) => {
            onClick?.(e);
            if (!e.defaultPrevented) {
              setOpen(false);
            }
          }}
          {...props}
        />
      );
    }
  );
  Backdrop.displayName = "DialogBackdrop";

  export namespace Popup {
    export interface Props extends React.HTMLAttributes<HTMLDivElement> {}
  }

  export const Popup = React.forwardRef<HTMLDivElement, Popup.Props>(
    ({ className, children, ...props }, ref) => {
      const { open } = useDialogContext();
      if (!open) return null;

      return (
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          data-open={open ? "" : undefined}
          data-closed={!open ? "" : undefined}
          className={className}
          {...props}
        >
          {children}
        </div>
      );
    }
  );
  Popup.displayName = "DialogPopup";

  export namespace Title {
    export interface Props extends React.HTMLAttributes<HTMLHeadingElement> {}
  }

  export const Title = React.forwardRef<HTMLHeadingElement, Title.Props>(
    ({ className, children, ...props }, ref) => {
      return (
        <h2 ref={ref} className={className} {...props}>
          {children}
        </h2>
      );
    }
  );
  Title.displayName = "DialogTitle";

  export namespace Description {
    export interface Props extends React.HTMLAttributes<HTMLParagraphElement> {}
  }

  export const Description = React.forwardRef<HTMLParagraphElement, Description.Props>(
    ({ className, children, ...props }, ref) => {
      return (
        <p ref={ref} className={className} {...props}>
          {children}
        </p>
      );
    }
  );
  Description.displayName = "DialogDescription";

  export namespace Close {
    export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      render?: React.ReactElement<any>;
    }
  }

  export const Close = React.forwardRef<HTMLButtonElement, Close.Props>(
    ({ render, onClick, children, ...props }, ref) => {
      const { setOpen } = useDialogContext();

      const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(false);
        }
      };

      if (React.isValidElement(render)) {
        return React.cloneElement(render, {
          ref,
          onClick: (e: any) => {
            (render.props as any)?.onClick?.(e);
            handleClick(e);
          },
          children: children || (render.props as any)?.children,
        });
      }

      return (
        <button ref={ref} type="button" onClick={handleClick} {...props}>
          {children}
        </button>
      );
    }
  );
  Close.displayName = "DialogClose";
}
