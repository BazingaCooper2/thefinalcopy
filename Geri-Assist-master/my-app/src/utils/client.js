import { useState } from "react";

export function Avatar({ src, size = 80 }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="d-flex align-items-center justify-content-center rounded-circle bg-light border shadow-sm"
        style={{ width: size, height: size }}
      >
        <i
          className="bi bi-person-fill text-muted"
          style={{ fontSize: size * 0.6 }}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Client"
      className="rounded-circle shadow-sm"
      style={{ width: size, height: size, objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
