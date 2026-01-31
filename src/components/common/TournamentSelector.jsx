import React from 'react';

/**
 * TournamentSelector Component
 * Chọn giải đấu từ danh sách
 */
const TournamentSelector = ({ 
  tournaments = [], 
  selectedIndex = 0, 
  onSelect 
}) => {
  if (!tournaments || tournaments.length === 0) {
    return <div>Không có giải đấu</div>;
  }

  return (
    <div className="tournament-selector">
      {tournaments.map((tournament, index) => (
        <div className="mb-2" key={tournament.index || index}>
          <input 
            type="radio" 
            className="btn-check" 
            name="tournamentRadio"
            id={`tournamentRadio-${tournament.index || index}`}
            value={tournament.name}
            checked={selectedIndex === (tournament.index || index)}
            onChange={() => onSelect(tournament.index || index)}
          />
          <label 
            className="btn btn-outline-secondary" 
            htmlFor={`tournamentRadio-${tournament.index || index}`}
          >
            <i className="fas fa-caret-right"></i> {tournament.name}
          </label>
        </div>
      ))}
    </div>
  );
};

export default TournamentSelector;
