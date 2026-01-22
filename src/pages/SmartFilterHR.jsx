import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "../css/SmartFilterHR.css";

export default function SmartFilterHR() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // best at top
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Fetch candidate list
  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("score", { ascending: false });

    if (!error) setCandidates(data);
  };

  // Filtering + search logic
  const filtered = candidates
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => (filterStatus === "all" ? true : c.status === filterStatus))
    .sort((a, b) =>
      sortOrder === "desc" ? b.score - a.score : a.score - b.score
    );

  return (
    <div className="smartfilter-container">
      <header className="sf-header">
        <h2>SmartFilter HR</h2>
        <p>Automatically rank candidates from good to best.</p>
      </header>

      {/* Filters */}
      <div className="sf-controls">
        <input
          type="text"
          placeholder="Search candidate name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select onChange={(e) => setSortOrder(e.target.value)}>
          <option value="desc">Best → Good</option>
          <option value="asc">Good → Best</option>
        </select>

        <select onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      {/* Table */}
      <table className="sf-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Experience</th>
            <th>Skills</th>
            <th>Score</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.experience} yrs</td>
              <td>
                <div className="skill-tags">
                  {c.skills?.split(",").map((s, i) => (
                    <span key={i} className="skill-tag">
                      {s}
                    </span>
                  ))}
                </div>
              </td>
              <td className="score-cell">{c.score}</td>
              <td>
                <span className={`status ${c.status}`}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p className="no-results">No candidates found.</p>
      )}
    </div>
  );
}
