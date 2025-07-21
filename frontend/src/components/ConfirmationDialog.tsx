export default function ConfirmationDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-md p-4 w-80 space-y-4">
        <p className="text-gray-800">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
