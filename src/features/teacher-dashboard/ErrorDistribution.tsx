import type { ErrorGroup } from "@/training/types";

const ERROR_LABELS: Readonly<Record<string, string>> = {
  SINGULARITY: "奇异位形",
  COLLISION: "碰撞风险",
  IK_FAILURE: "逆解失败",
};

export function ErrorDistribution({ groups }: { readonly groups: readonly ErrorGroup[] }) {
  const maximum = Math.max(1, ...groups.map((group) => group.count));
  return <section className="error-distribution" aria-label="错误类型分布">
    <div className="teacher-section-heading"><div><h2>错误类型分布</h2><p>按合成实训记录中的出现次数排序</p></div><span>{groups.length} 类</span></div>
    <ol>
      {groups.map((group) => <li key={group.code}>
        <div><strong>{group.code}</strong><span>{ERROR_LABELS[group.code] ?? "其他"}</span></div>
        <div className="fault-meter" aria-hidden="true"><span style={{ width: `${(group.count / maximum) * 100}%` }} /></div>
        <b>{group.count}</b>
      </li>)}
    </ol>
  </section>;
}
