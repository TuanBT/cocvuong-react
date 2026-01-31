import React from 'react';

/**
 * NumpadInput Component
 * Bàn phím số để nhập mật khẩu
 */
const NumpadInput = ({ onNumberClick, onClear }) => {
  const numbers = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 0]
  ];

  return (
    <div className="numPadPassword">
      {numbers.map((row, rowIndex) => (
        <div className="input-group mb-3" key={rowIndex}>
          {row.map((num) => (
            <button
              type="button"
              className="btn btn-outline-secondary btn-lg"
              key={num}
              onClick={() => onNumberClick(String(num))}
            >
              <i className={`fa-solid fa-${num}`}></i>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default NumpadInput;
