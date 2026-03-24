// 统一响应结构
export type Resp<T = any> = {
    code: number;
    message: string;
    data: T;
};

// 快捷响应辅助函数
export const success = <T = any>(data: T, message = 'success'): Resp<T> => ({
    code: 0,
    message: message,
    data: data,
});

export const error = (message: string, code = -1): Resp<null> => ({
    code: code,
    message: message,
    data: null,
});

