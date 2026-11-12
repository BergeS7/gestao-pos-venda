/**
 * components/usuarios/CampoSenhaProvisoria.tsx — Campo de senha provisória com "Gerar"
 *
 * O Admin pode digitar uma senha ou clicar em "Gerar" para criar uma
 * aleatória (lib/senhas.ts). A senha fica visível porque o Admin precisa
 * passá-la para a pessoa; ela será obrigada a trocá-la no primeiro login.
 */

import { gerarSenhaProvisoria } from '../../lib/senhas.ts'

type Props = {
  id: string
  valor: string
  onMudar: (valor: string) => void
  erro?: string
}

export default function CampoSenhaProvisoria({ id, valor, onMudar, erro }: Props) {
  return (
    <>
      <label htmlFor={id} className="form-label small fw-semibold mb-1">
        Senha provisória
      </label>
      <div className="input-group has-validation">
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={`form-control font-monospace ${erro ? 'is-invalid' : ''}`}
          value={valor}
          maxLength={72}
          onChange={(e) => onMudar(e.target.value)}
        />
        <button type="button" className="btn btn-outline-secondary" onClick={() => onMudar(gerarSenhaProvisoria())}>
          <i className="bi bi-shuffle me-1" aria-hidden="true" /> Gerar
        </button>
        <div className="invalid-feedback">{erro}</div>
      </div>
      <div className="form-text">Entregue à pessoa. Ela vai criar a própria senha no primeiro acesso.</div>
    </>
  )
}
