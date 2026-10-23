import type { JointVector } from "@/robotics/types";
import type { Lesson } from "./lesson-types";

const joints = (values: number[]) => Object.freeze(values) as JointVector;
const lesson = (value: Lesson): Lesson => Object.freeze({
  ...value,
  steps: Object.freeze([...value.steps]),
  observationPrompts: Object.freeze([...value.observationPrompts]),
  successChecks: Object.freeze([...value.successChecks]),
});

export const LESSONS: readonly Lesson[] = Object.freeze([
  lesson({ id: "frames", chapter: 1, title: "认识 UR5 与坐标系", objective: "识别六个旋转关节、基坐标系和法兰坐标系，建立自动化设备的空间描述基础。", concept: "工业机器人不是一组会动的零件，而是一条从基座到末端逐级传递的坐标变换链。", steps: ["开启坐标系显示，旋转视角观察基座与末端。", "依次拖动六个关节，判断每个转轴的方向。"], observationPrompts: ["哪个关节主要改变机械臂朝向？"], successChecks: ["能指出 J1—J6 和末端法兰坐标系。"], resetJoints: joints([0.2, -0.8, 1, -0.4, 0.6, -0.2]) }),
  lesson({ id: "dh", chapter: 2, title: "DH 参数与位姿变换", objective: "理解标准 DH 参数如何把相邻连杆坐标系组合成齐次变换矩阵。", concept: "每节连杆用一次旋转与平移描述，六个矩阵相乘即可得到末端位姿。", steps: ["改变 J2，观察矩阵中的位置列。", "比较 J2 正负变化时末端位置的差异。"], observationPrompts: ["矩阵最后一列的三个数分别表示什么？"], successChecks: ["能解释 4×4 齐次矩阵的旋转块与平移列。"], resetJoints: joints([0, -1.1, 1.25, -0.3, 0.8, 0]) }),
  lesson({ id: "fk", chapter: 3, title: "正运动学实验", objective: "从六个关节角预测末端位置，并用实时遥测验证正运动学计算结果。", concept: "正运动学回答已知关节角时末端在哪里，是仿真和控制的基础。", steps: ["记录初始末端坐标。", "只改变 J1，再改变 J3，对比末端轨迹。"], observationPrompts: ["为什么只改变一个关节也会影响后续全部连杆？"], successChecks: ["能根据关节变化定性判断末端移动方向。"], resetJoints: joints([0.45, -0.95, 1.15, -0.55, 0.7, 0.15]) }),
  lesson({ id: "ik", chapter: 4, title: "逆运动学求解", objective: "理解从目标位姿反求关节角的迭代过程，并认识多解、不可达与收敛误差。", concept: "逆运动学将末端目标转换为关节配置，通常需要初值、误差和迭代上限。", steps: ["观察当前位姿与关节配置的对应关系。", "尝试不同初始姿态，为后续目标求解建立直觉。"], observationPrompts: ["同一目标位姿为什么可能对应多组关节角？"], successChecks: ["能说出逆运动学失败的两种原因。"], resetJoints: joints([-0.25, -0.9, 1.35, -0.65, 0.55, 0.35]) }),
  lesson({ id: "jacobian", chapter: 5, title: "雅可比与奇异位形", objective: "通过最小奇异值和可操作度识别运动能力下降的机械臂姿态。", concept: "雅可比连接关节速度与末端速度；接近奇异位形时某些方向难以运动。", steps: ["缓慢伸直肘部，观察奇异风险指标。", "离开伸直位形，对比最小奇异值。"], observationPrompts: ["接近奇异位形时，控制系统为什么容易出现大关节速度？"], successChecks: ["能依据风险灯和数值判断当前位形。"], resetJoints: joints([0, -1.45, 1.45, 0, 0.15, 0]) }),
  lesson({ id: "trajectory", chapter: 6, title: "轨迹规划与安全", objective: "区分关节空间与笛卡尔空间轨迹，并理解限位、速度和碰撞检测的作用。", concept: "可到达不等于可安全执行；轨迹必须先预览、检测，再进入播放状态。", steps: ["设置起点姿态并观察关节余量。", "阅读实验检查项，预测危险动作会被哪条规则阻断。"], observationPrompts: ["直线末端轨迹为何不一定产生平滑关节轨迹？"], successChecks: ["能列出执行前的三类安全检查。"], resetJoints: joints([0.3, -1.05, 1.05, -0.45, 0.9, -0.1]) }),
  lesson({ id: "challenge", chapter: 7, title: "多 Agent 安全挑战", objective: "组织讲解、规划和安全 Agent 的协作边界，完成可解释且可复核的自动化任务。", concept: "大模型负责意图与解释，确定性算法负责计算，安全 Agent 保留最终否决权。", steps: ["描述一个末端移动任务和学习目标。", "核对规划依据、安全结论与最终执行状态。"], observationPrompts: ["为什么安全判定不能只依赖大模型文本？"], successChecks: ["能解释三个 Agent 的输入、输出和责任边界。"], resetJoints: joints([0.15, -0.75, 1.2, -0.75, 0.65, 0.25]) }),
]);
