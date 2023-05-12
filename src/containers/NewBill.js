import { ROUTES_PATH } from '../constants/routes.js'
import Logout from "./Logout.js"

export default class NewBill {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document
    this.onNavigate = onNavigate
    this.store = store
    const formNewBill = this.document.querySelector(`form[data-testid="form-new-bill"]`)
    formNewBill.addEventListener("submit", this.handleSubmit)
    const file = this.document.querySelector(`input[data-testid="file"]`)
    file.addEventListener("change", this.handleChangeFile)
    this.file = file
    this.fileUrl = null
    this.fileName = null
    this.billId = null
    this.valid = false
    new Logout({ document, localStorage, onNavigate })
  }

  handleChangeFile = e => {
    e.preventDefault()
    let fileInput = this.file
    let file = fileInput.files[0]
    const filePath = e.target.value.split(/\\/g)
    const fileName = filePath[filePath.length - 1]
    const acceptedTypes = ['image/jpg', 'image/jpeg', 'image/png']
    let isTypeValid = acceptedTypes.includes(file.type)

    if (!isTypeValid) {
      fileInput.value = null
      file = {}
      this.billId = null
      this.fileUrl = null
      this.fileName = null
      alert("Le format du fichier n'est pas valide. Veuillez sélectionner un fichier au format jpg, jpeg ou png.")
      this.valid = false
    }
    else {
      this.valid = true
      this.fileName = fileName
    }
  }

  handleSubmit = async (e) => {
    e.preventDefault()
    const bill = {
      email: JSON.parse(localStorage.getItem("user")).email,
      type: e.target.querySelector(`select[data-testid="expense-type"]`).value,
      name: e.target.querySelector(`input[data-testid="expense-name"]`).value,
      amount: parseInt(e.target.querySelector(`input[data-testid="amount"]`).value),
      date: e.target.querySelector(`input[data-testid="datepicker"]`).value,
      vat: e.target.querySelector(`input[data-testid="vat"]`).value,
      pct: parseInt(e.target.querySelector(`input[data-testid="pct"]`).value) || 20,
      commentary: e.target.querySelector(`textarea[data-testid="commentary"]`).value,
      fileUrl: this.fileUrl,
      fileName: this.fileName,
      status: 'pending'
    }

    if (this.valid) {
      await this.createBill(bill)
      this.onNavigate(ROUTES_PATH['Bills'])
    } else {
      alert("Veuillez soumettre le fichier avant de continuer.")
    }
  }

  createBill = async (bill) => {
    const formData = new FormData()
    formData.append('file', this.file.files[0])
    const email = JSON.parse(localStorage.getItem("user")).email
    formData.append('email', email)

    if (this.store) {
      this.store
        .bills()
        .create({
          data: formData,
          headers: {
            noContentType: true
          }
        })
        .then(({ fileUrl, key }) => {
          this.fileUrl = fileUrl
          this.billId = key
          this.store
            .bills()
            .update({ data: JSON.stringify(bill), selector: this.billId })
            .then(() => this.onNavigate(ROUTES_PATH['Bills']))
            .catch(err => console.error(err))
        })
        .catch(error => console.error(error))
    }
  }
}


