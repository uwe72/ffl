export default function Home() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Willkommen bei FFL
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Fantasy Football League Manager
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Saisons</h3>
          <p className="text-gray-600">Verwalte deine Spielzeiten</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Teams</h3>
          <p className="text-gray-600">Alle Bundesligisten im Überblick</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Spieler</h3>
          <p className="text-gray-600">Wähle deine Top11</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Manager</h3>
          <p className="text-gray-600">Tritt gegen andere an</p>
        </div>
      </div>
    </div>
  )
}