import { createRoot } from 'react-dom/client';

// Drop-in replacement for window.alert() that never uses a native OS dialog.
//
// Electron's alert()/confirm() ask the OS to show a real message box parented
// to the main window. On Windows, if that window doesn't have foreground
// focus at the exact moment the dialog is requested (e.g. right after a click
// closes a React overlay), Windows' foreground-lock can leave the message box
// unfocused behind the app instead of raising it. alert() blocks all
// renderer JS until the (invisible) dialog is dismissed, so the whole UI
// looks frozen and nothing short of killing the process recovers it. This
// renders the same message as an in-page overlay instead, so there is never a
// native dialog to lose focus.
let root = null;
let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  return root;
}

function AlertModal({ message, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition w-full"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function showAlert(message) {
  const r = ensureContainer();
  const close = () => r.render(null);
  r.render(<AlertModal message={message} onClose={close} />);
}
