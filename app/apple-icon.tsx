import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const logoBytes = await readFile(join(process.cwd(), "public", "pi", "ima.png"));
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={180}
          height={180}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 40,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
