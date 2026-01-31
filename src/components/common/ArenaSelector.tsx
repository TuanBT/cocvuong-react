import React from 'react';

interface ArenaSelectorProps {
  arenas?: string[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
}

/**
 * ArenaSelector Component  
 * Chọn sàn đấu từ danh sách
 */
const ArenaSelector: React.FC<ArenaSelectorProps> = ({ 
  arenas = [], 
  selectedIndex = 0, 
  onSelect 
}) => {
  if (!arenas || arenas.length === 0) {
    return <div>Không có sàn đấu</div>;
  }

  return (
    <div className="arena-selector">
      {arenas.map((arena, index) => (
        <div className="mb-2" key={index}>
          <input 
            type="radio" 
            className="btn-check" 
            name="arenaRadio"
            id={`arenaRadio-${index}`}
            value={arena}
            checked={selectedIndex === index}
            onChange={() => onSelect(index)}
          />
          <label 
            className="btn btn-outline-secondary" 
            htmlFor={`arenaRadio-${index}`}
          >
            <i className="fas fa-caret-right"></i> {arena}
          </label>
        </div>
      ))}
    </div>
  );
};

export default ArenaSelector;
