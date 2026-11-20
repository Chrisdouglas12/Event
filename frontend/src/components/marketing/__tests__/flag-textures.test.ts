import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { makeFlagGeometry } from "../flag-textures";

describe("makeFlagGeometry", () => {
  it("gives both printed flag faces full 0..1 UV coverage", () => {
    const geometry = makeFlagGeometry(THREE, 0.8, 0.5);

    // BoxGeometry order: +x, -x, +y, -y, +z, -z. The last two groups are
    // the front and back plates that carry the flag texture.
    expect(geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1, 2, 3, 4, 5]);

    const uv = geometry.getAttribute("uv");
    let minU = Infinity;
    let minV = Infinity;
    let maxU = -Infinity;
    let maxV = -Infinity;

    for (let i = 0; i < uv.count; i++) {
      minU = Math.min(minU, uv.getX(i));
      minV = Math.min(minV, uv.getY(i));
      maxU = Math.max(maxU, uv.getX(i));
      maxV = Math.max(maxV, uv.getY(i));
    }

    expect(minU).toBeCloseTo(0);
    expect(minV).toBeCloseTo(0);
    expect(maxU).toBeCloseTo(1);
    expect(maxV).toBeCloseTo(1);
  });
});
