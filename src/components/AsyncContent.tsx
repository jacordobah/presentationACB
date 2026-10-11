import type { ReactNode } from "react";
import type { Resource } from "../hooks/useResource";
import { Notice } from "./Notice";
import { ErrorState, LoadingState } from "./States";

interface AsyncContentProps<T> {
  resource: Resource<T>;
  loadingLabel?: string;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

export function AsyncContent<T>({
  resource,
  loadingLabel,
  isEmpty,
  empty,
  children,
}: AsyncContentProps<T>) {
  const { data, error, reload } = resource;
  if (data === undefined) {
    return error ? (
      <ErrorState message={error.message} onRetry={reload} />
    ) : (
      <LoadingState label={loadingLabel} />
    );
  }
  return (
    <>
      {error && (
        <Notice tone="warning">
          No se pudo actualizar la información. Mostramos los últimos datos
          recibidos.
        </Notice>
      )}
      {isEmpty?.(data) ? empty : children(data)}
    </>
  );
}
