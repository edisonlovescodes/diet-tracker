'use client';

import { Dialog } from "frosted-ui";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  widthClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({
  open,
  title,
  onClose,
  widthClassName = "max-w-lg",
  children,
  footer,
}: ModalProps) {
  const size = widthClassName === "max-w-lg" ? "3" : "4";

  return (
    <Dialog.Root open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
      <Dialog.Content
        size={size}
        className={`flex max-h-[80vh] w-full flex-col gap-0 overflow-hidden rounded-3xl ${widthClassName}`}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-[color:var(--gray-a5)] px-6 py-4">
            {title ? (
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {title}
              </Dialog.Title>
            ) : (
              <span />
            )}
            <Dialog.Close
              aria-label="Close"
              className="rounded-full border border-transparent p-2 text-sm text-foreground/60 transition hover:border-accent/40 hover:text-foreground"
            >
              ✕
            </Dialog.Close>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-[color:var(--gray-a5)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}
