export default function SearchBar() {
    return (
        <div className="mb-4">
            <input
                type="text"
                placeholder="Search documents..."
                className="w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
        </div>
    );
}