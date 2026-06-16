function StatsBar({ stats }) {
  return (
    <footer className="stats-bar" aria-label="Document statistics">
      <span>{stats.words} words</span>
      <span>{stats.characters} characters</span>
      <span>{stats.readingTime} min read</span>
    </footer>
  );
}

export default StatsBar;
