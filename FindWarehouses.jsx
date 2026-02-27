import React, { useMemo, useState } from "react";

const warehouses = [
  {
    id: 1,
    name: "GreenCold Warehouse",
    location: "Nashik",
    price: 1100,
    storageTime: "60 days",
    availableSpace: 20
  },
  {
    id: 2,
    name: "FreshCool Depot",
    location: "Pune",
    price: 900,
    storageTime: "90 days",
    availableSpace: 39
  },
  {
    id: 3,
    name: "FarmFresh Storage",
    location: "Aurangabad",
    price: 800,
    storageTime: "30 days",
    availableSpace: 80
  }
];

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22s7-5.7 7-12a7 7 0 1 0-14 0c0 6.3 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export default function FindWarehouses() {
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");

  const filteredWarehouses = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    if (!text) {
      return warehouses;
    }

    return warehouses.filter((warehouse) =>
      warehouse.location.toLowerCase().includes(text)
    );
  }, [searchText]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchText(query);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-green-950 px-4 py-8 text-green-50 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find Nearby Warehouses
        </h1>
        <p className="mt-3 text-lg text-green-100 sm:text-xl">
          Store your crops safely at best price
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-8 rounded-2xl bg-green-900/60 p-4 sm:p-6"
        >
          <label htmlFor="location" className="mb-3 block text-lg font-semibold">
            Search by place
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="location"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter your village or city"
              className="h-14 w-full rounded-xl border-2 border-green-400 bg-green-50 px-4 text-lg font-medium text-green-900 placeholder:text-green-700/60 focus:border-green-300 focus:outline-none"
            />
            <button
              type="submit"
              className="h-14 min-w-[170px] rounded-xl bg-green-500 px-6 text-lg font-bold text-white transition hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-300"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-6">
          {filteredWarehouses.length === 0 ? (
            <div className="rounded-2xl bg-green-900/60 p-6 text-center text-xl font-semibold text-green-100">
              No warehouse found for this location.
            </div>
          ) : (
            filteredWarehouses.map((warehouse) => (
              <article
                key={warehouse.id}
                className="rounded-2xl border border-green-700 bg-green-900/70 p-5 shadow-lg sm:p-6"
              >
                <h2 className="text-2xl font-extrabold text-green-50 sm:text-3xl">
                  {warehouse.name}
                </h2>

                <p className="mt-2 flex items-center gap-2 text-lg text-green-200">
                  <LocationIcon />
                  <span>{warehouse.location}</span>
                </p>

                <div className="mt-5 grid gap-3 text-lg sm:grid-cols-2">
                  <p className="rounded-lg bg-green-800/70 px-4 py-3 font-semibold text-green-50">
                    {"\u20B9"} Price: {warehouse.price} per ton
                  </p>
                  <p className="flex items-center gap-2 rounded-lg bg-green-800/70 px-4 py-3 font-semibold text-green-50">
                    <CalendarIcon />
                    <span>Storage Time: {warehouse.storageTime}</span>
                  </p>
                  <p className="rounded-lg bg-green-800/70 px-4 py-3 font-semibold text-green-50 sm:col-span-2">
                    Available Space: {warehouse.availableSpace} tons
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-6 h-14 w-full rounded-xl bg-green-500 text-xl font-extrabold text-white transition hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-300"
                >
                  Store Here
                </button>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
