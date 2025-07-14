import { Link } from "react-router-dom";

export default function ExplorePage() {
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <header>
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Explore Documents</h1>
                    <Link
                        to="/dashboard"
                        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 my-5 rounded transition"
                    >
                        ⬅ Back to Menu
                    </Link>
                </div>
                <hr className="border-t border-gray-300" />
            </header>

            <div className="max-w-6xl mx-auto mt-8 bg-white rounded-xl shadow-md p-8 text-center">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Document Explorer
                </h2>
                <p className="text-gray-600">
                    This feature is coming soon. You'll be able to browse and search all your processed documents here.
                </p>
            </div>
        </div>
    );
}