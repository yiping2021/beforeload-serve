const NULL = 0;
const PI = 3.14159265358979323846264338327;

const AreaShowType = {
  Area_AabbBox: 0, //Aabb包围盒
  Area_Hexaherdron: 1, //六面体
  Area_TriangularPrism: 2, //三棱柱
  Area_Cylinder: 3, //圆柱
};

/**
 * 三维向量，包含向量常用的运算方法，当前系统使用数组表示向量，三维向量是包含三个Number的数组
 */
let Vec3 = (function () {
  return {
    /**
     * 判断对象是否是合格的向量
     * @param {*} a 检查对象
     */
    check: function (a) {
      if (!Array.isArray(a)) return false;
      for (let i = 0; i < 3; ++i) if (isNaN(a[i])) return false;
      return true;
    },

    /**
     * 向量a与向量b相加，a + b
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     */
    add: function (a, b) {
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    },

    /**
     * 向量a与常数b相加，a + b
     * @param {[Number, Number, Number]} a 向量a
     * @param {Number} b 常数b
     */
    addScalar: function (a, b) {
      return [a[0] + b, a[1] + b, a[2] + b];
    },

    /**
     * 向量a与向量b相减， a - b
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     */
    sub: function (a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    },

    /**
     * 向量a与常数b相减，a - b
     * @param {[Number, Number, Number]} a 向量a
     * @param {Number} b 常数b
     */
    subScalar: function (a, b) {
      return [a[0] - b, a[1] - b, a[2] - b];
    },

    /**
     * 向量a与向量b相乘， a * b
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     */
    multiply: function (a, b) {
      return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
    },

    /**
     * 向量a与常数b相乘，a * b
     * @param {[Number, Number, Number]} a 向量a
     * @param {Number} b 常数b
     */
    multiplyScalar: function (a, b) {
      return [a[0] * b, a[1] * b, a[2] * b];
    },

    /**
     * 向量a与向量b相除， a / b
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     * @note 向量b各分量不能为0
     */
    divide: function (a, b) {
      return [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
    },

    /**
     * 向量a与常数b相除，a / b
     * @param {[Number, Number, Number]} a 向量a
     * @param {Number} b 常数b
     * @note 常数b不能为0
     */
    divideScalar: function (a, b) {
      return [a[0] / b, a[1] / b, a[2] / b];
    },

    /**
     * 向量a与向量b点乘， dot(a, b) = |a| * |b| * cos
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     */
    dot: function (a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },

    /**
     * 向量a与向量b叉乘， cross(a, b) = 法向量，同时垂直于向量a和向量b
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     */
    cross: function (a, b) {
      return [
        a[1] * b[2] - b[1] * a[2],
        a[2] * b[0] - b[2] * a[0],
        a[0] * b[1] - b[0] * a[1],
      ];
    },

    /**
     * 获取向量a的模长/长度, length(a) = |a|
     * @param {[Number, Number, Number]} a 向量a
     */
    length: function (a) {
      return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    },

    /**
     * 获取向量a的模长/长度的平方，lengthSq(a) = length(a) * length(a)
     * @param {[Number, Number, Number]} a 向量a
     */
    lengthSq: function (a) {
      return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    },

    /**
     * 向量取反
     * @param {[Number, Number, Number]} a 向量a
     */
    negate: function (a) {
      return [-a[0], -a[1], -a[2]];
    },

    /**
     * 获取单位向量
     * @param {[Number, Number, Number]} a 向量a
     */
    normalize: function (a) {
      var len = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1;
      return [a[0] / len, a[1] / len, a[2] / len];
    },

    /**
     * 向量a与向量b的夹角
     * @param {[Number, Number, Number]} a 向量a
     * @param {[Number, Number, Number]} b 向量b
     * @param 返回两个向量的夹角(角度制)
     */
    angleBetween: function (a, b) {
      const denominator = Vec3.length(a) * Vec3.length(b);

      if (denominator === 0) return (Math.PI / 2) * (180 / Math.PI);

      let theta = Vec3.dot(a, b) / denominator;

      if (theta < -1) theta = -1;
      if (theta > 1) theta = 1;

      let angle = Math.acos(theta);
      angle *= 180 / Math.PI;

      return angle;
    },
  };
})();

/**
 * 行优先4x4矩阵
 */
let Matrix4 = (function () {
  return {
    /**
     * 获取单位矩阵
     * @returns 单位矩阵
     */
    identity: function () {
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    },

    /**
     * 检查a是否是合法的矩阵
     * @param {*} a 检查对象
     */
    check: function (a) {
      if (!Array.isArray(a)) return false;
      for (let i = 0; i < 16; ++i) if (isNaN(a[i])) return false;
      return true;
    },

    /**
     * 矩阵a与矩阵b相乘
     * @param {[...Number]} a
     * @param {[...Number]} b
     */
    multiply: function (a, b) {
      const ae = a;
      const be = b;

      const a11 = ae[0],
        a12 = ae[4],
        a13 = ae[8],
        a14 = ae[12];
      const a21 = ae[1],
        a22 = ae[5],
        a23 = ae[9],
        a24 = ae[13];
      const a31 = ae[2],
        a32 = ae[6],
        a33 = ae[10],
        a34 = ae[14];
      const a41 = ae[3],
        a42 = ae[7],
        a43 = ae[11],
        a44 = ae[15];

      const b11 = be[0],
        b12 = be[4],
        b13 = be[8],
        b14 = be[12];
      const b21 = be[1],
        b22 = be[5],
        b23 = be[9],
        b24 = be[13];
      const b31 = be[2],
        b32 = be[6],
        b33 = be[10],
        b34 = be[14];
      const b41 = be[3],
        b42 = be[7],
        b43 = be[11],
        b44 = be[15];

      let rMat = [];

      rMat[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
      rMat[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
      rMat[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
      rMat[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

      rMat[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
      rMat[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
      rMat[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
      rMat[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

      rMat[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
      rMat[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
      rMat[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
      rMat[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

      rMat[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
      rMat[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
      rMat[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
      rMat[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

      return rMat;
    },

    /**
     * 矩阵a与三维坐标b相乘，返回变换后的坐标
     * @param {[...Number]} a 矩阵a
     * @param {[Number,Number,Number]} b 三维坐标b
     */
    multiplyPos: function (a, b) {
      var ret = [];
      for (var i = 0; i < 3; ++i) {
        ret[i] = a[12 + i];
        for (var j = 0; j < 3; ++j) {
          ret[i] += b[j] * a[j * 4 + i];
        }
      }
      return ret;
    },

    /**
     * 矩阵a与方向向量b相乘，返回变化后的方向
     * @param {[...Number]} a 矩阵a
     * @param {[Number,Number,Number]} b 三维向量b
     */
    multiplyDir: function (a, b) {
      var ret = [];
      for (var i = 0; i < 3; ++i) {
        ret[i] = 0;
        for (var j = 0; j < 3; ++j) {
          ret[i] += b[j] * a[j * 4 + i];
        }
      }
      return ret;
    },

    /**
     * 构造TRS矩阵
     * @param position 位置
     * @param quaternion 旋转四元数(顺序wxyz)
     * @param scale 缩放
     * @returns 4x4 TRS矩阵
     */
    compose: function (position, quaternion, scale) {
      var ret = [];

      const x = quaternion[1];
      const y = quaternion[2];
      const z = quaternion[3];
      const w = quaternion[0];

      const x2 = x + x;
      const y2 = y + y;
      const z2 = z + z;
      const xx = x * x2;
      const xy = x * y2;
      const xz = x * z2;
      const yy = y * y2;
      const yz = y * z2;
      const zz = z * z2;
      const wx = w * x2;
      const wy = w * y2;
      const wz = w * z2;

      const sx = scale[0];
      const sy = scale[1];
      const sz = scale[2];

      ret[0] = (1 - (yy + zz)) * sx;
      ret[1] = (xy + wz) * sx;
      ret[2] = (xz - wy) * sx;
      ret[3] = 0;

      ret[4] = (xy - wz) * sy;
      ret[5] = (1 - (xx + zz)) * sy;
      ret[6] = (yz + wx) * sy;
      ret[7] = 0;

      ret[8] = (xz + wy) * sz;
      ret[9] = (yz - wx) * sz;
      ret[10] = (1 - (xx + yy)) * sz;
      ret[11] = 0;

      ret[12] = position[0];
      ret[13] = position[1];
      ret[14] = position[2];
      ret[15] = 1;

      return ret;
    },

    /**
     * 矩阵萃取
     * @param {*} m 将被萃取的矩阵对象
     * @returns 萃取结果
     *          - position: 萃取的位置信息
     *          - quaternion: 萃取的旋转四元数信息
     *          - rotation: 萃取的旋转矩阵信息
     *          - scale:萃取的缩放信息
     */
    decompose: function (m) {
      var a = {};

      var vx = [m[0], m[1], m[2]];
      var vy = [m[4], m[5], m[6]];
      var vz = [m[8], m[9], m[10]];

      let sx = Vec3.length(vx);
      const sy = Vec3.length(vy);
      const sz = Vec3.length(vz);

      // if determine is negative, we need to invert one scale
      const det = Matrix4.determinant(m);
      if (det < 0) sx = -sx;

      a.position = [];
      a.position[0] = m[12];
      a.position[1] = m[13];
      a.position[2] = m[14];

      // scale the rotation part
      var rMat = m;
      rMat[12] = 0;
      rMat[13] = 0;
      rMat[14] = 0;

      const invSX = 1 / sx;
      const invSY = 1 / sy;
      const invSZ = 1 / sz;

      rMat[0] *= invSX;
      rMat[1] *= invSX;
      rMat[2] *= invSX;

      rMat[4] *= invSY;
      rMat[5] *= invSY;
      rMat[6] *= invSY;

      rMat[8] *= invSZ;
      rMat[9] *= invSZ;
      rMat[10] *= invSZ;

      a.rotation = rMat;
      a.quaternion = Quat.fromRotationMatrix(rMat);

      a.scale = [];
      a.scale[0] = sx;
      a.scale[1] = sy;
      a.scale[2] = sz;

      return a;
    },

    /**
     * 计算矩阵行列式
     * @param {*} m 将被计算行列式的矩阵对象
     * @returns 矩阵的行列式值
     */
    determinant: function (m) {
      const n11 = m[0],
        n12 = m[1],
        n13 = m[2],
        n14 = m[3];
      const n21 = m[4],
        n22 = m[5],
        n23 = m[6],
        n24 = m[7];
      const n31 = m[8],
        n32 = m[9],
        n33 = m[10],
        n34 = m[11];
      const n41 = m[12],
        n42 = m[13],
        n43 = m[14],
        n44 = m[15];

      return (
        n41 *
          (+n14 * n23 * n32 -
            n13 * n24 * n32 -
            n14 * n22 * n33 +
            n12 * n24 * n33 +
            n13 * n22 * n34 -
            n12 * n23 * n34) +
        n42 *
          (+n11 * n23 * n34 -
            n11 * n24 * n33 +
            n14 * n21 * n33 -
            n13 * n21 * n34 +
            n13 * n24 * n31 -
            n14 * n23 * n31) +
        n43 *
          (+n11 * n24 * n32 -
            n11 * n22 * n34 -
            n14 * n21 * n32 +
            n12 * n21 * n34 +
            n14 * n22 * n31 -
            n12 * n24 * n31) +
        n44 *
          (-n13 * n22 * n31 -
            n11 * n23 * n32 +
            n11 * n22 * n33 +
            n13 * n21 * n32 -
            n12 * n21 * n33 +
            n12 * n23 * n31)
      );
    },

    /**
     * 计算矩阵的逆
     * @param {*} m 将被计算逆的矩阵对象
     * @returns 矩阵的逆矩阵
     * */
    inverse: function (m) {
      // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm

      const n11 = m[0],
        n21 = m[1],
        n31 = m[2],
        n41 = m[3],
        n12 = m[4],
        n22 = m[5],
        n32 = m[6],
        n42 = m[7],
        n13 = m[8],
        n23 = m[9],
        n33 = m[10],
        n43 = m[11],
        n14 = m[12],
        n24 = m[13],
        n34 = m[14],
        n44 = m[15],
        t11 =
          n23 * n34 * n42 -
          n24 * n33 * n42 +
          n24 * n32 * n43 -
          n22 * n34 * n43 -
          n23 * n32 * n44 +
          n22 * n33 * n44,
        t12 =
          n14 * n33 * n42 -
          n13 * n34 * n42 -
          n14 * n32 * n43 +
          n12 * n34 * n43 +
          n13 * n32 * n44 -
          n12 * n33 * n44,
        t13 =
          n13 * n24 * n42 -
          n14 * n23 * n42 +
          n14 * n22 * n43 -
          n12 * n24 * n43 -
          n13 * n22 * n44 +
          n12 * n23 * n44,
        t14 =
          n14 * n23 * n32 -
          n13 * n24 * n32 -
          n14 * n22 * n33 +
          n12 * n24 * n33 +
          n13 * n22 * n34 -
          n12 * n23 * n34;

      const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

      if (det === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      const detInv = 1 / det;

      let invMat = [];

      invMat[0] = t11 * detInv;
      invMat[1] =
        (n24 * n33 * n41 -
          n23 * n34 * n41 -
          n24 * n31 * n43 +
          n21 * n34 * n43 +
          n23 * n31 * n44 -
          n21 * n33 * n44) *
        detInv;
      invMat[2] =
        (n22 * n34 * n41 -
          n24 * n32 * n41 +
          n24 * n31 * n42 -
          n21 * n34 * n42 -
          n22 * n31 * n44 +
          n21 * n32 * n44) *
        detInv;
      invMat[3] =
        (n23 * n32 * n41 -
          n22 * n33 * n41 -
          n23 * n31 * n42 +
          n21 * n33 * n42 +
          n22 * n31 * n43 -
          n21 * n32 * n43) *
        detInv;

      invMat[4] = t12 * detInv;
      invMat[5] =
        (n13 * n34 * n41 -
          n14 * n33 * n41 +
          n14 * n31 * n43 -
          n11 * n34 * n43 -
          n13 * n31 * n44 +
          n11 * n33 * n44) *
        detInv;
      invMat[6] =
        (n14 * n32 * n41 -
          n12 * n34 * n41 -
          n14 * n31 * n42 +
          n11 * n34 * n42 +
          n12 * n31 * n44 -
          n11 * n32 * n44) *
        detInv;
      invMat[7] =
        (n12 * n33 * n41 -
          n13 * n32 * n41 +
          n13 * n31 * n42 -
          n11 * n33 * n42 -
          n12 * n31 * n43 +
          n11 * n32 * n43) *
        detInv;

      invMat[8] = t13 * detInv;
      invMat[9] =
        (n14 * n23 * n41 -
          n13 * n24 * n41 -
          n14 * n21 * n43 +
          n11 * n24 * n43 +
          n13 * n21 * n44 -
          n11 * n23 * n44) *
        detInv;
      invMat[10] =
        (n12 * n24 * n41 -
          n14 * n22 * n41 +
          n14 * n21 * n42 -
          n11 * n24 * n42 -
          n12 * n21 * n44 +
          n11 * n22 * n44) *
        detInv;
      invMat[11] =
        (n13 * n22 * n41 -
          n12 * n23 * n41 -
          n13 * n21 * n42 +
          n11 * n23 * n42 +
          n12 * n21 * n43 -
          n11 * n22 * n43) *
        detInv;

      invMat[12] = t14 * detInv;
      invMat[13] =
        (n13 * n24 * n31 -
          n14 * n23 * n31 +
          n14 * n21 * n33 -
          n11 * n24 * n33 -
          n13 * n21 * n34 +
          n11 * n23 * n34) *
        detInv;
      invMat[14] =
        (n14 * n22 * n31 -
          n12 * n24 * n31 -
          n14 * n21 * n32 +
          n11 * n24 * n32 +
          n12 * n21 * n34 -
          n11 * n22 * n34) *
        detInv;
      invMat[15] =
        (n12 * n23 * n31 -
          n13 * n22 * n31 +
          n13 * n21 * n32 -
          n11 * n23 * n32 -
          n12 * n21 * n33 +
          n11 * n22 * n33) *
        detInv;

      return invMat;
    },

    /**
     * 指定旋转角和旋转轴计算一个旋转矩阵
     * @param {Number} angle 旋转角(角度制)
     * @param {[Number, Number, Number]} axis 旋转轴(单位向量)
     * @returns 4x4的旋转矩阵
     * */
    makeRotationAxis: function (angle, axis) {
      const tAngne = (angle * Math.PI) / 180;
      // Based on http://www.gamedev.net/reference/articles/article1199.asp
      const c = Math.cos(tAngne);
      const s = Math.sin(tAngne);
      const t = 1 - c;
      const x = axis[0],
        y = axis[1],
        z = axis[2];
      const tx = t * x,
        ty = t * y;

      let rMat = [];
      rMat[0] = tx * x + c;
      rMat[4] = tx * y - s * z;
      rMat[8] = tx * z + s * y;
      rMat[12] = 0;
      rMat[1] = tx * y + s * z;
      rMat[5] = ty * y + c;
      rMat[9] = ty * z - s * x;
      rMat[13] = 0;
      rMat[2] = tx * z - s * y;
      rMat[6] = ty * z + s * x;
      rMat[10] = t * z * z + c;
      rMat[14] = 0;
      rMat[3] = 0;
      rMat[7] = 0;
      rMat[11] = 0;
      rMat[15] = 1;
      return rMat;
    },
  };
})();

/**
 * 四元素
 *  注：这里四元数对应Player返回的四元数对象，Player返回的四元数的顺序是 [w,x,y,z]
 *   因此这里四元数所有算法也应该遵循Player中的 [w,x,y,z]顺序
 */
let Quat = (function () {
  return {
    /**
     * 检查a是否是合法的四元数
     * @param {*} a 检查对象
     */
    check: function (a) {
      if (!Array.isArray(a)) return false;
      for (let i = 0; i < 4; ++i) if (isNaN(a[i])) return false;
      if (
        Math.abs(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] - 1) >
        0.01
      )
        return false;
      return true;
    },
    /**
     * 转换旋转矩阵到四元数
     * @param {*} m 旋转矩阵
     * @returns 旋转四元数
     */
    fromRotationMatrix: function (m) {
      (m11 = m[0]),
        (m12 = m[4]),
        (m13 = m[8]),
        (m21 = m[1]),
        (m22 = m[5]),
        (m23 = m[9]),
        (m31 = m[2]),
        (m32 = m[6]),
        (m33 = m[10]),
        (trace = m11 + m22 + m33);

      q = [];

      if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1.0);

        q[0] = 0.25 / s;
        q[1] = (m32 - m23) * s;
        q[2] = (m13 - m31) * s;
        q[3] = (m21 - m12) * s;
      } else if (m11 > m22 && m11 > m33) {
        const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

        q[0] = (m32 - m23) / s;
        q[1] = 0.25 * s;
        q[2] = (m12 + m21) / s;
        q[3] = (m13 + m31) / s;
      } else if (m22 > m33) {
        const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

        q[0] = (m13 - m31) / s;
        q[1] = (m12 + m21) / s;
        q[2] = 0.25 * s;
        q[3] = (m23 + m32) / s;
      } else {
        const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

        q[0] = (m21 - m12) / s;
        q[1] = (m13 + m31) / s;
        q[2] = (m23 + m32) / s;
        q[3] = 0.25 * s;
      }

      return q;
    },
    /**
     * 转换四元数到旋转矩阵
     * @param m 旋转四元数
     * @returns 旋转矩阵
     */
    toRotationMatrix: function (q) {
      return Matrix4.compose([0, 0, 0], q, [1, 1, 1]);
    },
  };
})();

let EulerAngle = (function () {
  return {
    /**
     * 转换旋转矩阵到欧拉角
     * @param m 旋转矩阵(4x4)
     * @param order 欧拉角顺序, 取值分别为: "XYZ", "YXZ", "ZXY", "ZYX", "YZX", "XZY"
     * @returns 欧拉角
     */
    fromRotationMatrix: function (m, order = "XYZ") {
      var ret = [];

      const te = m;
      const m11 = te[0],
        m12 = te[4],
        m13 = te[8];
      const m21 = te[1],
        m22 = te[5],
        m23 = te[9];
      const m31 = te[2],
        m32 = te[6],
        m33 = te[10];

      switch (order) {
        case "XYZ":
          let prop = null;
          if (m13 < -1) {
            prop = -1;
          } else if (m13 > 1) {
            prop = 1;
          } else {
            prop = m13;
          }
          // ret[1] = Math.asin(Math.clamp(m13, -1, 1))
          ret[1] = Math.asin(prop);

          if (Math.abs(m13) < 0.9999999) {
            ret[0] = Math.atan2(-m23, m33);
            ret[2] = Math.atan2(-m12, m11);
          } else {
            ret[0] = Math.atan2(m32, m22);
            ret[2] = 0;
          }

          break;

        case "YXZ":
          ret[0] = Math.asin(-clamp(m23, -1, 1));

          if (Math.abs(m23) < 0.9999999) {
            ret[1] = Math.atan2(m13, m33);
            ret[2] = Math.atan2(m21, m22);
          } else {
            ret[1] = Math.atan2(-m31, m11);
            ret[2] = 0;
          }

          break;

        case "ZXY":
          ret[0] = Math.asin(clamp(m32, -1, 1));

          if (Math.abs(m32) < 0.9999999) {
            ret[1] = Math.atan2(-m31, m33);
            ret[2] = Math.atan2(-m12, m22);
          } else {
            ret[1] = 0;
            ret[2] = Math.atan2(m21, m11);
          }

          break;

        case "ZYX":
          ret[1] = Math.asin(-clamp(m31, -1, 1));

          if (Math.abs(m31) < 0.9999999) {
            ret[0] = Math.atan2(m32, m33);
            ret[2] = Math.atan2(m21, m11);
          } else {
            ret[0] = 0;
            ret[2] = Math.atan2(-m12, m22);
          }

          break;

        case "YZX":
          ret[2] = Math.asin(clamp(m21, -1, 1));

          if (Math.abs(m21) < 0.9999999) {
            ret[0] = Math.atan2(-m23, m22);
            ret[1] = Math.atan2(-m31, m11);
          } else {
            ret[0] = 0;
            ret[1] = Math.atan2(m13, m33);
          }

          break;

        case "XZY":
          ret[2] = Math.asin(-clamp(m12, -1, 1));

          if (Math.abs(m12) < 0.9999999) {
            ret[0] = Math.atan2(m32, m22);
            ret[1] = Math.atan2(m13, m11);
          } else {
            ret[0] = Math.atan2(-m23, m33);
            ret[1] = 0;
          }

          break;

        default:
          console.warn(" unknown order: " + order);
      }
      //弧度制转角度制
      ret[0] = (ret[0] * 180) / Math.PI;
      ret[1] = (ret[1] * 180) / Math.PI;
      ret[2] = (ret[2] * 180) / Math.PI;
      return ret;
    },
    /**
     * 转换欧拉角到旋转矩阵
     * @param euler 欧拉角
     * @param order 欧拉角顺序, 取值分别为: "XYZ", "YXZ", "ZXY", "ZYX", "YZX", "XZY"
     * @returns 4x4旋转矩阵
     */
    toRotationMatrix: function (euler, order = "XYZ") {
      var ret = [];

      const x = (euler[0] * Math.PI) / 180;
      const y = (euler[1] * Math.PI) / 180;
      const z = (euler[2] * Math.PI) / 180;
      const a = Math.cos(x);
      const b = Math.sin(x);
      const c = Math.cos(y);
      const d = Math.sin(y);
      const e = Math.cos(z);
      const f = Math.sin(z);

      if (order === "XYZ") {
        const ae = a * e,
          af = a * f,
          be = b * e,
          bf = b * f;

        ret[0] = c * e;
        ret[4] = -c * f;
        ret[8] = d;

        ret[1] = af + be * d;
        ret[5] = ae - bf * d;
        ret[9] = -b * c;

        ret[2] = bf - ae * d;
        ret[6] = be + af * d;
        ret[10] = a * c;
      } else if (order === "YXZ") {
        const ce = c * e,
          cf = c * f,
          de = d * e,
          df = d * f;

        ret[0] = ce + df * b;
        ret[4] = de * b - cf;
        ret[8] = a * d;

        ret[1] = a * f;
        ret[5] = a * e;
        ret[9] = -b;

        ret[2] = cf * b - de;
        ret[6] = df + ce * b;
        ret[10] = a * c;
      } else if (order === "ZXY") {
        const ce = c * e,
          cf = c * f,
          de = d * e,
          df = d * f;

        ret[0] = ce - df * b;
        ret[4] = -a * f;
        ret[8] = de + cf * b;

        ret[1] = cf + de * b;
        ret[5] = a * e;
        ret[9] = df - ce * b;

        ret[2] = -a * d;
        ret[6] = b;
        ret[10] = a * c;
      } else if (order === "ZYX") {
        const ae = a * e,
          af = a * f,
          be = b * e,
          bf = b * f;

        ret[0] = c * e;
        ret[4] = be * d - af;
        ret[8] = ae * d + bf;

        ret[1] = c * f;
        ret[5] = bf * d + ae;
        ret[9] = af * d - be;

        ret[2] = -d;
        ret[6] = b * c;
        ret[10] = a * c;
      } else if (order === "YZX") {
        const ac = a * c,
          ad = a * d,
          bc = b * c,
          bd = b * d;

        ret[0] = c * e;
        ret[4] = bd - ac * f;
        ret[8] = bc * f + ad;

        ret[1] = f;
        ret[5] = a * e;
        ret[9] = -b * e;

        ret[2] = -d * e;
        ret[6] = ad * f + bc;
        ret[10] = ac - bd * f;
      } else if (order === "XZY") {
        const ac = a * c,
          ad = a * d,
          bc = b * c,
          bd = b * d;

        ret[0] = c * e;
        ret[4] = -f;
        ret[8] = d * e;

        ret[1] = ac * f + bd;
        ret[5] = a * e;
        ret[9] = ad * f - bc;

        ret[2] = bc * f - ad;
        ret[6] = b * e;
        ret[10] = bd * f + ac;
      }

      // bottom row
      ret[3] = 0;
      ret[7] = 0;
      ret[11] = 0;

      // last column
      ret[12] = 0;
      ret[13] = 0;
      ret[14] = 0;
      ret[15] = 1;

      return ret;
    },
    /**
     * 转换旋转四元数到欧拉角
     * @param q 旋转四元数(wxyz)
     * @param order 欧拉角顺序, 取值分别为: "XYZ", "YXZ", "ZXY", "ZYX", "YZX", "XZY"
     * @returns 旋转四元数
     */
    fromQuat: function (q, order = "XYZ") {
      return EulerAngle.fromRotationMatrix(Quat.toRotationMatrix(q), order);
    },
    /**
     * 转换欧拉角到旋转四元数
     * @param euler 欧拉角
     * @param order 欧拉角顺序, 取值分别为: "XYZ", "YXZ", "ZXY", "ZYX", "YZX", "XZY"
     * @returns 旋转四元数(wxyz)
     */
    toQuat: function (euler, order = "XYZ") {
      var q = [];
      const x = (euler[0] * Math.PI) / 180;
      const y = (euler[1] * Math.PI) / 180;
      const z = (euler[2] * Math.PI) / 180;

      const cos = Math.cos;
      const sin = Math.sin;

      const c1 = cos(x / 2);
      const c2 = cos(y / 2);
      const c3 = cos(z / 2);

      const s1 = sin(x / 2);
      const s2 = sin(y / 2);
      const s3 = sin(z / 2);

      switch (order) {
        case "XYZ":
          q[1] = s1 * c2 * c3 + c1 * s2 * s3;
          q[2] = c1 * s2 * c3 - s1 * c2 * s3;
          q[3] = c1 * c2 * s3 + s1 * s2 * c3;
          q[0] = c1 * c2 * c3 - s1 * s2 * s3;
          break;

        case "YXZ":
          q[1] = s1 * c2 * c3 + c1 * s2 * s3;
          q[2] = c1 * s2 * c3 - s1 * c2 * s3;
          q[3] = c1 * c2 * s3 - s1 * s2 * c3;
          q[0] = c1 * c2 * c3 + s1 * s2 * s3;
          break;

        case "ZXY":
          q[1] = s1 * c2 * c3 - c1 * s2 * s3;
          q[2] = c1 * s2 * c3 + s1 * c2 * s3;
          q[3] = c1 * c2 * s3 + s1 * s2 * c3;
          q[0] = c1 * c2 * c3 - s1 * s2 * s3;
          break;

        case "ZYX":
          q[1] = s1 * c2 * c3 - c1 * s2 * s3;
          q[2] = c1 * s2 * c3 + s1 * c2 * s3;
          q[3] = c1 * c2 * s3 - s1 * s2 * c3;
          q[0] = c1 * c2 * c3 + s1 * s2 * s3;
          break;

        case "YZX":
          q[1] = s1 * c2 * c3 + c1 * s2 * s3;
          q[2] = c1 * s2 * c3 + s1 * c2 * s3;
          q[3] = c1 * c2 * s3 - s1 * s2 * c3;
          q[0] = c1 * c2 * c3 - s1 * s2 * s3;
          break;

        case "XZY":
          q[1] = s1 * c2 * c3 - c1 * s2 * s3;
          q[2] = c1 * s2 * c3 - s1 * c2 * s3;
          q[3] = c1 * c2 * s3 + s1 * s2 * c3;
          q[0] = c1 * c2 * c3 + s1 * s2 * s3;
          break;

        default:
          console.warn("unknown order: " + order);
      }

      return q;
    },
  };
})();
/**
 * 包围盒
 */
let Aabb = (function () {
  return {
    /**
     * 检查a是否是合法的包围盒
     * @param {*} a 检查对象
     */
    check: function (a) {
      if (!Array.isArray(a)) return false;
      if (isNaN(a.min) || isNaN(a.max)) return false;
      for (let i = 0; i < 3; ++i)
        if (isNaN(a.min[i]) || isNaN(a.max[i])) return false;
      return true;
    },

    /**
     * map(min、max)解成二维数组
     * @param {[{"min", [Number, Number, Number]}， {"max", [Number, Number, Number]}]} a map a
     */
    deMap: function (a) {
      return [a.min, a.max];
    },

    /**
     * 获取包围盒8个顶点
     * @param a [ [Number, Number, Number]，[Number, Number, Number]] a aabb
     */
    vertex8: function (a) {
      return [
        [a[0][0], a[0][1], a[0][2]],

        [a[0][0], a[1][1], a[0][2]],

        [a[1][0], a[1][1], a[0][2]],

        [a[1][0], a[0][1], a[0][2]],

        [a[1][0], a[1][1], a[1][2]],

        [a[0][0], a[1][1], a[1][2]],

        [a[0][0], a[0][1], a[1][2]],

        [a[1][0], a[0][1], a[1][2]],
      ];
    },
    /**
     * 获取包围盒某个面
     * @param a [ [Number, Number, Number]，[Number, Number, Number]] a aabb
     * @param faceName 面名称: X,XN,Y,YN,Z,ZN
     */
    face: function (a, faceName = "Z") {
      let fIdx = [];
      switch (faceName) {
        case "X":
          {
            fIdx = [3, 2, 4, 7]; //X
          }
          break;
        case "XN":
          {
            fIdx = [1, 0, 6, 5]; //XN
          }
          break;
        case "Y":
          {
            fIdx = [2, 1, 5, 4]; //Y
          }
          break;
        case "YN":
          {
            fIdx = [0, 3, 7, 6]; //YN
          }
          break;
        case "Z":
          {
            fIdx = [6, 7, 4, 5]; //Z
          }
          break;
        case "ZN":
          {
            fIdx = [1, 2, 3, 0]; //ZN
          }
          break;
        default:
          {
            console.warn("unknown face: " + faceName);
            return [];
          }
          break;
      }
      const v8 = Aabb.vertex8(a);
      return [v8[fIdx[0]], v8[fIdx[1]], v8[fIdx[2]], v8[fIdx[3]]];
    },
    /**
     * 获取包围盒某个面中心点
     * @param a [ [Number, Number, Number]，[Number, Number, Number]] a aabb
     * @param faceName 面名称: X,XN,Y,YN,Z,ZN
     */
    faceCenter: function (a, faceName = "Z") {
      const face = Aabb.face(a, faceName);
      const a0 = Vec3.add(face[0], face[1]);
      const a1 = Vec3.add(a0, face[2]);
      let a2 = Vec3.add(a1, face[3]);
      a2[0] /= 4;
      a2[1] /= 4;
      a2[2] /= 4;
      return a2;
    },
    /**
     * 获取包围盒中心点
     * @param [ [Number, Number, Number]，[Number, Number, Number]] a aabb
     */
    center: function (a) {
      let cen = Vec3.add(a[0], a[1]);
      cen = Vec3.multiplyScalar(cen, 0.5);
      return cen;
    },
  };
})();

/**
 * Player常用函数集合
 */
let PlayerUtils = (function () {
  return {
    /**
     * 使用Promise封装异步接口调用
     * @param {Function} fun 要调用的函数
     * @param  {...any} args 参数
     * @example
     *  var info = await PlayerUtils.call(player.Model.getInfo, 'sampler.pr') //使用await
     *  PlayerUtils.call(player.Model.getInfo, 'sampler.pr').then((info)=>{ console.log(info) }); //使用then
     */
    call: function (fun, ...args) {
      return new Promise((resolve) => {
        fun(...args, (ret) => {
          resolve(ret);
        });
      });
    },

    /**
     * 计算包围盒的视口信息
     * @param {{min:[Number,Number,Number],max:[Number,Number,Number]}} aabb 目标包围盒
     * @param {[Number,Number,Number]} eyeDir 摄像机方向
     * @param {[Number,Number,Number]} upDir 摄像机上方向，不能与eyeDir重合
     * @param {Number} lenScalar 摄像机距离系数，越大越远
     */
    calAabbViewParam: function (aabb, eyeDir, upDir, lenScalar) {
      var target = Vec3.divideScalar(Vec3.add(aabb.min, aabb.max), 2);
      var dir = Vec3.normalize(eyeDir);
      var len = Vec3.length(Vec3.sub(aabb.max, aabb.min)) * lenScalar;
      var eye = Vec3.add(Vec3.multiplyScalar(dir, len), target);
      var up = Vec3.normalize(Vec3.cross(Vec3.cross(dir, upDir), dir));
      return {
        eye: eye,
        target: target,
        up: up,
      };
    },

    /**
     * 移动相机看向模型，适用于模型所在高程瓦片已加载完成或禁用地形跟随
     * @param {RemotePlayer} player Player对象
     * @param {String} modelId 模型ID
     * @param {[Number,Number,Number]|Function} eyeDir 摄像机方向，基于模型局部坐标系，或计算相机方向的函数
     * @param {[Number,Number,Number]} upDir 摄像机上方向，不能与eyeDir重合，基于模型局部坐标系
     * @param {Number} lenScalar 摄像机距离系数，越大越远
     * @param {Number} second 摄像机过渡时间
     * @example
     *  PlayerUtils.moveToModel(player, "data://models/sampler.pr", [1,0,0], [0,0,1], 2); //[1,0,0]=>从右看向左边
     */
    moveToModel: async function (
      player,
      modelId,
      eyeDir,
      upDir,
      lenScalar = 1,
      second = 1
    ) {
      var info = await PlayerUtils.call(player.Native.Model.getInfo, modelId);
      var mat = await PlayerUtils.call(
        player.Native.Model.getModelMatrix,
        modelId
      );
      if (typeof eyeDir == "function") eyeDir = eyeDir(info.srcAabb);
      var param = PlayerUtils.calAabbViewParam(
        info.srcAabb,
        eyeDir,
        upDir,
        lenScalar
      );
      param.eye = Matrix4.multiplyPos(mat, param.eye);
      param.target = Matrix4.multiplyPos(mat, param.target);
      param.up = Matrix4.multiplyDir(mat, param.up);
      await PlayerUtils.call(
        player.Native.Camera.moveTo,
        param.eye,
        param.target,
        param.up,
        second
      );
    },

    /**
     * 移动相机看向包围盒
     * @param {RemotePlayer} player Player对象
     * @param {{min:[Number,Number,Number], max:[Number,Number,Number]}} aabb 模型ID
     * @param {[...Number]} mat 包围盒需要运用的矩阵
     * @param {[Number,Number,Number]} eyeDir 摄像机方向，基于模型局部坐标系
     * @param {[Number,Number,Number]} upDir 摄像机上方向，不能与eyeDir重合，基于模型局部坐标系
     * @param {Number} lenScalar 摄像机距离系数，越大越远
     * @param {Number} second 摄像机过渡时间
     * @example
     *  PlayerUtils.moveToAabb(player, {min:[-1,-1,-1],max:[1,1,1]}, [1,0,0], [0,0,1], 2); //[1,0,0]=>从右看向左边
     */
    moveToAabb: async function (
      player,
      aabb,
      mat,
      eyeDir,
      upDir,
      lenScalar = 1,
      second = 1
    ) {
      var param = PlayerUtils.calAabbViewParam(aabb, eyeDir, upDir, lenScalar);
      param.eye = Matrix4.multiplyPos(mat, param.eye);
      param.target = Matrix4.multiplyPos(mat, param.target);
      param.up = Matrix4.multiplyDir(mat, param.up);
      await PlayerUtils.call(
        player.Native.Camera.moveTo,
        param.eye,
        param.target,
        param.up,
        second
      );
    },

    /**
     * 添加移动相机看向包围盒任务
     * @param {RemotePlayer} player Player对象
     * @param {{min:[Number,Number,Number], max:[Number,Number,Number]}} aabb 模型ID
     * @param {[...Number]} mat 包围盒需要运用的矩阵
     * @param {[Number,Number,Number]} eyeDir 摄像机方向，基于模型局部坐标系
     * @param {[Number,Number,Number]} upDir 摄像机上方向，不能与eyeDir重合，基于模型局部坐标系
     * @param {Number} lenScalar 摄像机距离系数，越大越远
     * @param {Number} second 摄像机过渡时间
     * @example
     *  PlayerUtils.addMoveToAabb(player, {min:[-1,-1,-1],max:[1,1,1]}, [1,0,0], [0,0,1], 2); //[1,0,0]=>从右看向左边
     */
    addMoveToAabb: async function (
      player,
      aabb,
      mat,
      eyeDir,
      upDir,
      lenScalar = 1,
      second = 1
    ) {
      var param = PlayerUtils.calAabbViewParam(aabb, eyeDir, upDir, lenScalar);
      param.eye = Matrix4.multiplyPos(mat, param.eye);
      param.target = Matrix4.multiplyPos(mat, param.target);
      param.up = Matrix4.multiplyDir(mat, param.up);
      await PlayerUtils.call(
        player.Native.Camera.addMoveTo,
        param.eye,
        param.target,
        param.up,
        second
      );
    },
  };
})();

module.exports = {
  PlayerUtils,
};
