export function success(
  message: string = 'Operation successful',
  data: any = null,
  props: Record<string, any> = {}
) {
  return {
    success: true,
    message,
    data,
    ...props,
  };
}

export function failure(
  message: string = 'Something went wrong'
) {
  return {
    success: false,
    message,
    data: null,
  };
}
